# ProofRoom Gateway UI overlay

Local UI modifications to official Switch revision `12c48336dd37a18c70f3e8ccec0807ada452407d`. No upstream contribution or accepted PR is claimed.

Adds shared diagram zoom controls, bounded fit, readable canvas labels, responsive toolbars and shell spacing, table alignment, navigation feedback, and reduced-motion support. No API authorization or agent permissions are changed.

`runtime/bootstrap.ps1` applies this overlay before building. Run `runtime/apply-gateway-ui.py` with the A-drive Python to reapply; it verifies all checksums and refuses conflicting edits. Restart the local Switch process after rebuilding because the server loads the asset allowlist at startup.

Derived upstream files retain the Switch license reproduced in `UPSTREAM-LICENSE` (Apache 2.0 with its modified Commons Clause condition). This is distinct from ProofRoom original-source licensing.
