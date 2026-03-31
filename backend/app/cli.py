import sys
import argparse
from uuid import UUID

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.client import Client


def create_user(
    email: str,
    password: str,
    role: str = "client",
    client_id: str = None
):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: User with email '{email}' already exists.")
            return False

        role_enum = UserRole.ADMIN if role == "admin" else UserRole.CLIENT
        client_uuid = None
        
        if client_id:
            try:
                client_uuid = UUID(client_id)
                client = db.query(Client).filter(Client.id == client_uuid).first()
                if not client:
                    print(f"Error: Client with ID '{client_id}' not found.")
                    return False
            except ValueError:
                print(f"Error: Invalid UUID format for client_id: '{client_id}'")
                return False

        if role_enum == UserRole.ADMIN and client_uuid is not None:
            print("Error: Admin users cannot be associated with a client.")
            return False

        if role_enum == UserRole.CLIENT and client_uuid is None:
            print("Error: Client users must be associated with a client. Use --client-id to specify.")
            return False

        user = User(
            email=email,
            password_hash=User.hash_password(password),
            role=role_enum,
            client_id=client_uuid,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Successfully created user:")
        print(f"  ID:       {user.id}")
        print(f"  Email:    {user.email}")
        print(f"  Role:     {user.role.value}")
        print(f"  Client:   {client_uuid or 'N/A'}")
        print(f"  Active:   {user.is_active}")
        return True

    finally:
        db.close()


def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No users found.")
            return

        print(f"\n{'ID':<38} {'Email':<40} {'Role':<10} {'Client ID':<38} {'Active'}")
        print("-" * 140)
        for user in users:
            print(f"{str(user.id):<38} {user.email:<40} {user.role.value:<10} {str(user.client_id) if user.client_id else 'N/A':<38} {user.is_active}")
        print()
    finally:
        db.close()


def list_clients():
    db = SessionLocal()
    try:
        clients = db.query(Client).all()
        if not clients:
            print("No clients found.")
            return

        print(f"\n{'ID':<38} {'Company Name'}")
        print("-" * 60)
        for client in clients:
            print(f"{str(client.id):<38} {client.company_name}")
        print()
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="NOC Platform CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    create_parser = subparsers.add_parser("create-user", help="Create a new user")
    create_parser.add_argument("--email", required=True, help="User email")
    create_parser.add_argument("--password", required=True, help="User password")
    create_parser.add_argument("--role", choices=["admin", "client"], default="client", help="User role")
    create_parser.add_argument("--client-id", help="UUID of the client (required for client users)")

    list_parser = subparsers.add_parser("list-users", help="List all users")

    list_clients_parser = subparsers.add_parser("list-clients", help="List all clients")

    args = parser.parse_args()

    if args.command == "create-user":
        success = create_user(
            email=args.email,
            password=args.password,
            role=args.role,
            client_id=args.client_id
        )
        sys.exit(0 if success else 1)
    elif args.command == "list-users":
        list_users()
    elif args.command == "list-clients":
        list_clients()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
