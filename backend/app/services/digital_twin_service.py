from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ParkingNode, ParkingSensor, ParkingSlot, ParkingZone


class DigitalTwinService:
    @staticmethod
    async def get_layout(db: AsyncSession) -> dict:
        z_res = await db.execute(select(ParkingZone))
        zones = z_res.scalars().all()

        s_res = await db.execute(select(ParkingSlot))
        slots = s_res.scalars().all()

        sen_res = await db.execute(select(ParkingSensor))
        sensors = sen_res.scalars().all()

        n_res = await db.execute(select(ParkingNode))
        nodes = n_res.scalars().all()

        floors = list({z.floor for z in zones if z.floor})

        return {
            "floors": floors,
            "zones": [
                {
                    "id": z.id,
                    "name": z.name,
                    "floor": z.floor,
                    "description": z.description,
                    "x": z.x_coord,
                    "y": z.y_coord,
                    "width": z.width,
                    "height": z.height,
                }
                for z in zones
            ],
            "slots": [
                {
                    "id": s.id,
                    "zone_id": s.zone_id,
                    "slot_number": s.slot_number,
                    "status": s.status,
                    "slot_type": s.slot_type,
                    "x": s.x_coord,
                    "y": s.y_coord,
                    "width": s.width,
                    "height": s.height,
                }
                for s in slots
            ],
            "sensors": [
                {
                    "id": sen.id,
                    "slot_id": sen.slot_id,
                    "sensor_code": sen.sensor_code,
                    "sensor_type": sen.sensor_type,
                    "is_active": sen.is_active,
                    "last_ping": sen.last_ping,
                }
                for sen in sensors
            ],
            "nodes": [
                {
                    "id": n.id,
                    "zone_id": n.zone_id,
                    "node_type": n.node_type,
                    "x": n.x_coord,
                    "y": n.y_coord,
                    "label": n.label,
                }
                for n in nodes
            ],
        }

    @staticmethod
    async def get_floors(db: AsyncSession) -> list[str]:
        z_res = await db.execute(select(ParkingZone))
        zones = z_res.scalars().all()
        return list({z.floor for z in zones if z.floor})

    @staticmethod
    async def get_sensors(db: AsyncSession) -> list[dict]:
        sen_res = await db.execute(select(ParkingSensor))
        sensors = sen_res.scalars().all()
        return [
            {
                "id": sen.id,
                "slot_id": sen.slot_id,
                "sensor_code": sen.sensor_code,
                "sensor_type": sen.sensor_type,
                "is_active": sen.is_active,
                "last_ping": sen.last_ping,
            }
            for sen in sensors
        ]

    @staticmethod
    async def get_nodes(db: AsyncSession) -> list[dict]:
        n_res = await db.execute(select(ParkingNode))
        nodes = n_res.scalars().all()
        return [
            {
                "id": n.id,
                "zone_id": n.zone_id,
                "node_type": n.node_type,
                "x": n.x_coord,
                "y": n.y_coord,
                "label": n.label,
            }
            for n in nodes
        ]

    @staticmethod
    async def generate_twin_layout(
        db: AsyncSession,
        num_floors: int = 3,
        slots_per_floor: int = 20,
        slots_per_zone: int | None = 10,
        clear_existing: bool = False,
    ) -> dict:
        from datetime import datetime, timezone
        from sqlalchemy import delete

        spz = slots_per_zone if (slots_per_zone and slots_per_zone > 0) else 10

        if clear_existing:
            await db.execute(delete(ParkingSensor))
            await db.execute(delete(ParkingNode))
            await db.execute(delete(ParkingSlot))
            await db.execute(delete(ParkingZone))
            await db.commit()

        floor_names = []
        if num_floors == 1:
            floor_names = ["GROUND"]
        elif num_floors == 2:
            floor_names = ["GROUND", "FLOOR 1"]
        else:
            floor_names = ["GROUND"] + [f"FLOOR {i}" for i in range(1, num_floors)]

        letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

        created_zones_count = 0
        created_slots_count = 0
        created_sensors_count = 0

        for fl_name in floor_names:
            # Calculate zones for this floor
            zones_needed = max(1, (slots_per_floor + spz - 1) // spz)
            remaining_slots = slots_per_floor

            for z_idx in range(zones_needed):
                z_letter = letters[z_idx % len(letters)]
                zone_name = f"Floor {fl_name} - Zone {z_letter}"

                # Check if zone exists if not clear_existing
                z_res = await db.execute(select(ParkingZone).where(ParkingZone.name == zone_name))
                zone = z_res.scalar_one_or_none()

                if not zone:
                    zone = ParkingZone(
                        name=zone_name,
                        floor=fl_name,
                        description=f"Auto-generated Digital Twin Zone {z_letter} on {fl_name}",
                        x_coord=10.0 + (z_idx * 320.0),
                        y_coord=10.0,
                        width=300.0,
                        height=220.0,
                    )
                    db.add(zone)
                    await db.flush()
                    await db.refresh(zone)
                    created_zones_count += 1

                # Slots in this zone
                slots_in_this_zone = min(remaining_slots, spz)
                remaining_slots -= slots_in_this_zone

                for s_idx in range(slots_in_this_zone):
                    slot_num = f"{fl_name[0]}{z_letter}-{101 + s_idx}"
                    if fl_name == "GROUND":
                        slot_num = f"G{z_letter}-{101 + s_idx}"
                    elif "FLOOR" in fl_name:
                        fl_num_str = fl_name.replace("FLOOR", "").strip()
                        slot_num = f"F{fl_num_str}{z_letter}-{101 + s_idx}"

                    # Slot type assignment
                    stype = "STANDARD"
                    if s_idx == 0:
                        stype = "EV_CHARGING"
                    elif s_idx == 1:
                        stype = "HANDICAPPED"
                    elif s_idx == 2:
                        stype = "VIP"

                    # 2D Canvas coordinate mapping inside zone
                    row = s_idx // 5
                    col = s_idx % 5
                    x_pos = (zone.x_coord or 0.0) + 15 + (col * 55)
                    y_pos = (zone.y_coord or 0.0) + 40 + (row * 75)

                    # Check slot number uniqueness
                    sl_res = await db.execute(
                        select(ParkingSlot).where(
                            ParkingSlot.zone_id == zone.id,
                            ParkingSlot.slot_number == slot_num,
                        )
                    )
                    existing_slot = sl_res.scalar_one_or_none()
                    if not existing_slot:
                        slot = ParkingSlot(
                            zone_id=zone.id,
                            slot_number=slot_num,
                            status="AVAILABLE",
                            x_coord=x_pos,
                            y_coord=y_pos,
                            width=45.0,
                            height=65.0,
                            slot_type=stype,
                        )
                        db.add(slot)
                        await db.flush()
                        await db.refresh(slot)
                        created_slots_count += 1

                        # Auto-create sensor for digital twin telemetry
                        sensor_code = f"SEN-{slot.slot_number}"
                        sen_res = await db.execute(
                            select(ParkingSensor).where(ParkingSensor.sensor_code == sensor_code)
                        )
                        if not sen_res.scalar_one_or_none():
                            sensor = ParkingSensor(
                                slot_id=slot.id,
                                sensor_code=sensor_code,
                                sensor_type="ULTRASONIC",
                                is_active=True,
                                last_ping=datetime.now(timezone.utc),
                            )
                            db.add(sensor)
                            created_sensors_count += 1

                # Node for zone
                node_label = f"Entry Node - {zone_name}"
                n_res = await db.execute(
                    select(ParkingNode).where(ParkingNode.label == node_label)
                )
                if not n_res.scalar_one_or_none():
                    node = ParkingNode(
                        zone_id=zone.id,
                        node_type="GATE_ENTRY",
                        x_coord=(zone.x_coord or 0.0) + 10.0,
                        y_coord=(zone.y_coord or 0.0) + 10.0,
                        label=node_label,
                    )
                    db.add(node)

        await db.commit()
        layout_data = await DigitalTwinService.get_layout(db)

        return {
            "status": "success",
            "message": f"Digital Twin layout generated for {num_floors} floors with {slots_per_floor} slots/floor.",
            "num_floors": num_floors,
            "slots_per_floor": slots_per_floor,
            "created_zones": created_zones_count,
            "created_slots": created_slots_count,
            "created_sensors": created_sensors_count,
            "layout": layout_data,
        }

