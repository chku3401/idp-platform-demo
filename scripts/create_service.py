import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from idp_platform.generator import (
    ServiceExistsError,
    ServiceGenerationError,
    generate_service,
)


def main():
    parser = argparse.ArgumentParser(description="Generate a new service from the IDP demo template")
    parser.add_argument("--service-name", required=True)
    parser.add_argument("--team", required=True)
    parser.add_argument("--language", choices=["java", "node"], required=True)
    parser.add_argument("--namespace", required=True)
    args = parser.parse_args()

    try:
        result = generate_service(
            service_name=args.service_name,
            team=args.team,
            language=args.language,
            namespace=args.namespace,
        )
    except (ServiceGenerationError, ServiceExistsError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Generated service: {result['service']}")
    print(f"Location: {result['path']}")
    for item in result["generated_items"]:
        print(f"  - {item}")


if __name__ == "__main__":
    main()
