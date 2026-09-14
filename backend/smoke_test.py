"""Final comprehensive smoke test for A.S.T.R.A backend."""
import asyncio
import time
import httpx
from datetime import datetime, timezone

BASE = 'http://localhost:8000'


async def wait_for_server():
    for _ in range(15):
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                h = await c.get(f'{BASE}/health')
                if h.status_code == 200:
                    print(f'HEALTH: {h.status_code} - server ready')
                    return True
        except Exception:
            time.sleep(1)
    print('ERROR: Server not ready')
    return False


async def smoke():
    if not await wait_for_server():
        return

    async with httpx.AsyncClient(timeout=20) as c:

        # ============= AUTH SECURITY TESTS =============
        print('\n=== AUTH SECURITY ===')

        # SECURITY FIX: Public registration must always create RESIDENT
        r2 = await c.post(f'{BASE}/auth/register', json={
            'full_name': 'Role Injection Test',
            'email': f'roletest_{int(time.time())}@astra.dev',
            'password': 'Test@2026',
            'role': 'ADMIN'
        })
        data2 = r2.json()
        role_assigned = data2.get('role', 'N/A')
        if r2.status_code == 201 and role_assigned == 'RESIDENT':
            print(f'PASS: Role injection blocked - role_assigned=RESIDENT (not ADMIN)')
        elif r2.status_code in (400, 422):
            print(f'PASS: Role injection request rejected with {r2.status_code}')
        else:
            print(f'FAIL: role_assigned={role_assigned}, status={r2.status_code}')

        # Login as resident
        login = await c.post(f'{BASE}/auth/login', json={
            'email': 'smoketest_qa@astra.dev',
            'password': 'Smoke@2026'
        })
        tokens = login.json()
        access = tokens.get('access_token', '')
        refresh = tokens.get('refresh_token', '')
        print(f'LOGIN: {login.status_code}')

        me = await c.get(f'{BASE}/auth/me', headers={'Authorization': f'Bearer {access}'})
        me_data = me.json()
        print(f'ME: role={me_data.get("role")}, email={me_data.get("email")}')

        headers = {'Authorization': f'Bearer {access}'}

        # ============= RESIDENT WORKFLOW =============
        print('\n=== RESIDENT WORKFLOW ===')

        # List vehicles (from prior test run)
        vlist = await c.get(f'{BASE}/vehicles', headers=headers)
        vlist_data = vlist.json()
        count = len(vlist_data) if isinstance(vlist_data, list) else 0
        vehicle_id = vlist_data[0].get('id') if count > 0 else None
        print(f'LIST VEHICLES: {vlist.status_code}, count={count}')

        # Create a new visitor for this test
        visit_ts = int(time.time())
        vis = await c.post(f'{BASE}/visitors', json={
            'full_name': f'QR Test Visitor {visit_ts}',
            'phone': '9999999999',
            'email': f'qrtest_{visit_ts}@smoke.dev'
        }, headers=headers)
        vis_data = vis.json()
        visitor_id = vis_data.get('id')
        print(f'CREATE VISITOR: {vis.status_code}, id={visitor_id}')

        # Create visitor request
        visit_date = datetime.now(timezone.utc).isoformat()
        req = await c.post(f'{BASE}/visitor-requests', json={
            'visitor_id': visitor_id,
            'vehicle_id': vehicle_id,
            'purpose': 'QR Smoke Test',
            'visit_date': visit_date,
        }, headers=headers)
        req_data = req.json()
        req_id = req_data.get('id')
        print(f'CREATE VISITOR REQUEST: {req.status_code}, id={req_id}')

        # Approve the request (should auto-generate access pass)
        if req_id:
            approve = await c.post(f'{BASE}/visitor-requests/{req_id}/approve', headers=headers)
            print(f'APPROVE REQUEST {req_id}: {approve.status_code}')

        # === NEW: Get access pass via by-request endpoint ===
        if req_id:
            pass_by_req = await c.get(f'{BASE}/access-passes/by-request/{req_id}', headers=headers)
            pass_data = pass_by_req.json()
            pass_id = pass_data.get('id')
            qr_token = pass_data.get('qr_token', '')
            pass_status = pass_data.get('status', '')
            print(f'GET PASS BY REQUEST: {pass_by_req.status_code}, pass_id={pass_id}, status={pass_status}, token_prefix={qr_token[:12] if qr_token else "N/A"}')

        # === NEW: List access passes ===
        pass_list = await c.get(f'{BASE}/access-passes', headers=headers)
        pass_list_data = pass_list.json()
        pass_count = len(pass_list_data) if isinstance(pass_list_data, list) else 0
        print(f'LIST ACCESS PASSES: {pass_list.status_code}, count={pass_count}')

        # === QR Image ===
        if pass_id:
            qr = await c.get(f'{BASE}/access-passes/{pass_id}/qr-image', headers=headers)
            qr_data = qr.json()
            has_data_uri = bool(qr_data.get('qr_image_data_uri', ''))
            uri_prefix = qr_data.get('qr_image_data_uri', '')[:30] if has_data_uri else 'N/A'
            print(f'QR IMAGE: {qr.status_code}, has_data_uri={has_data_uri}, prefix={uri_prefix}')

        # === Security: verify QR token ===
        if qr_token:
            verify = await c.post(f'{BASE}/access-passes/verify', json={'qr_token': qr_token})
            verify_data = verify.json()
            print(f'VERIFY QR: {verify.status_code}, status={verify_data.get("status")}, visitor={verify_data.get("visitor_name")}')

        # Create dispute
        disp = await c.post(f'{BASE}/disputes', json={
            'title': 'Final Smoke Test Dispute',
            'description': 'Comprehensive QA test dispute'
        }, headers=headers)
        print(f'CREATE DISPUTE: {disp.status_code}, id={disp.json().get("id")}')

        # Chatbot
        chat_session = await c.post(f'{BASE}/chat/sessions', json={'title': 'Final QA Chat'}, headers=headers)
        session_id = chat_session.json().get('id') if chat_session.status_code == 201 else None
        if session_id:
            chat_resp = await c.post(f'{BASE}/chat', json={
                'session_id': session_id,
                'prompt': 'What are the visitor parking rules for residents?'
            }, headers=headers)
            chat_data = chat_resp.json()
            print(f'CHATBOT: {chat_resp.status_code}, mode={chat_data.get("mode")}, has_answer={bool(chat_data.get("answer"))}')

        # ============= RBAC ENFORCEMENT =============
        print('\n=== RBAC ENFORCEMENT ===')
        tests = [
            ('POST', '/parking/assign', {'slot_id': 1, 'vehicle_id': 1}, 403, 'RESIDENT -> parking/assign'),
            ('POST', '/parking/release', {'slot_id': 1}, 403, 'RESIDENT -> parking/release'),
            ('GET', '/admin/users', None, 403, 'RESIDENT -> admin/users'),
            ('POST', '/security/entry', {'qr_token': 'fake'}, 403, 'RESIDENT -> security/entry'),
            ('GET', '/analytics/overview', None, 403, 'RESIDENT -> analytics/overview'),
        ]
        for method, path, body, expected, label in tests:
            if method == 'GET':
                res = await c.get(f'{BASE}{path}', headers=headers)
            else:
                res = await c.post(f'{BASE}{path}', json=body, headers=headers)
            status_ok = 'PASS' if res.status_code == expected else 'FAIL'
            print(f'{status_ok}: {label} -> {res.status_code} (expect {expected})')

        # ============= LOGOUT =============
        print('\n=== SESSION MANAGEMENT ===')
        lo = await c.post(f'{BASE}/auth/logout', headers=headers)
        me2 = await c.get(f'{BASE}/auth/me', headers=headers)
        print(f'LOGOUT: {lo.status_code}')
        print(f'TOKEN INVALIDATED AFTER LOGOUT: {"PASS" if me2.status_code == 401 else "FAIL"} ({me2.status_code})')

        # ============= RESIDENTS/ME AUTO-PROVISION =============
        print('\n=== RESIDENT PROFILE AUTO-PROVISION ===')
        # Create a brand new user to test auto-provision
        ts = int(time.time())
        new_reg = await c.post(f'{BASE}/auth/register', json={
            'full_name': 'Auto Profile Test',
            'email': f'autoprofile_{ts}@astra.dev',
            'password': 'Auto@2026'
        })
        new_login = await c.post(f'{BASE}/auth/login', json={
            'email': f'autoprofile_{ts}@astra.dev',
            'password': 'Auto@2026'
        })
        new_token = new_login.json().get('access_token', '')
        new_headers = {'Authorization': f'Bearer {new_token}'}

        # First GET /residents/me should auto-create profile
        profile = await c.get(f'{BASE}/residents/me', headers=new_headers)
        profile_data = profile.json()
        print(f'GET /residents/me (new user auto-provision): {profile.status_code}, apt={profile_data.get("apartment_number")}')

        # Create visitor request without manually creating resident profile first
        v_new = await c.post(f'{BASE}/visitors', json={
            'full_name': 'Auto Test Visitor',
            'phone': '1234567890',
        }, headers=new_headers)
        v_new_id = v_new.json().get('id')
        req_new = await c.post(f'{BASE}/visitor-requests', json={
            'visitor_id': v_new_id,
            'purpose': 'Auto provision test',
            'visit_date': datetime.now(timezone.utc).isoformat()
        }, headers=new_headers)
        print(f'VISITOR REQUEST (auto-provisioned profile): {req_new.status_code}, id={req_new.json().get("id")}')

        print('\n=== ALL SMOKE TESTS COMPLETE ===')


if __name__ == "__main__":
    asyncio.run(smoke())
