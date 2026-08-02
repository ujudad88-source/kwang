# Admin module

DOM root: `#adminRoot`

Rules:
- CSS must begin with `#adminRoot`.
- JavaScript may query only inside this root unless using a shared service.
- Do not modify sibling page roots.
- Shared Firebase/auth code belongs in `app/shared`.
