$ErrorActionPreference='Stop'
. 'A:\FlipTheSwitch\runtime\enter-controller.ps1'
& node 'A:\FlipTheSwitch\runtime\controller\releases\0.31.1-dev.311.g63c85ad\package\cli.mjs' run --data-dir 'A:\FlipTheSwitch\runtime\controller\data' --updated-by-console
exit $LASTEXITCODE

