from app.services.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


password = "ASTRA@123"

hashed = hash_password(password)

print("Original password:", password)
print("Hashed password:", hashed)

print(
    "Password verification:",
    verify_password(password, hashed),
)


access_token = create_access_token(
    user_id=1,
    role="ADMIN",
)

refresh_token = create_refresh_token(
    user_id=1,
)


print("\nAccess token:")
print(access_token)

print("\nRefresh token:")
print(refresh_token)

print("\nDecoded access token:")
print(decode_token(access_token))

print("\nSecurity module working successfully.")