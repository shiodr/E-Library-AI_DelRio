"""Provision an existing account through a trusted server shell, never public registration."""

import argparse
from pathlib import Path

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.tls import database_connect_args
from app.models import User


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="Email of an account that has already registered")
    parser.add_argument("--env-file", type=Path, help="Backend dotenv file; never supply passwords on the command line")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--grant", action="store_true")
    action.add_argument("--revoke", action="store_true")
    args = parser.parse_args()
    settings = Settings(_env_file=args.env_file) if args.env_file else Settings()
    engine = create_engine(settings.sqlalchemy_url, connect_args=database_connect_args(settings), pool_pre_ping=True)
    try:
        with Session(engine) as db:
            user = db.scalar(select(User).where(func.lower(User.email) == args.email.strip().lower()).with_for_update())
            if user is None:
                parser.exit(2, "Account not found. Register through the application before provisioning access.\n")
            user.role = "admin" if args.grant else "reader"
            db.commit()
            print(f"Account access updated: {user.role}. Refresh or sign in again to update the navigation.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
