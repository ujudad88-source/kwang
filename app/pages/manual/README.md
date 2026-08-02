# Manual module

DOM root: `#manualPanel`

Rules:
- CSS must begin with `#manualPanel`.
- JavaScript may query only inside this root unless using a shared service.
- Do not modify sibling page roots.
- Shared Firebase/auth code belongs in `app/shared`.
