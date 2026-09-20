"""Provision one authorised Auditor or Manager account interactively."""

import argparse
import getpass

from app.auth import hash_password
from app.db import database_session
from app.models import Auditor


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("staff_id", help="Unique staff ID used at login")
    parser.add_argument("role", choices=("auditor", "manager"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords did not match")

    with database_session() as db:
        if db.get(Auditor, args.staff_id) is not None:
            raise SystemExit("A staff account with that ID already exists")
        db.add(
            Auditor(
                auditor_id=args.staff_id,
                login_hash=hash_password(password),
                role=args.role,
            )
        )

    print(f"Created {args.role} account: {args.staff_id}")


if __name__ == "__main__":
    main()
