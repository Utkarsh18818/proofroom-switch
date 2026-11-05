import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import { useLocation } from "react-router";
import { useAuth } from "../data/AuthContext";

const SECTION_LABELS: [prefix: string, label: string][] = [
  ["/ecosystem", "Ecosystem"],
  ["/rooms", "Rooms"],
  ["/resources", "Resources"],
  ["/agents", "Agents"],
  ["/collaborations", "Messaging Apps"],
  ["/registration-keys", "API Keys"],
  ["/users", "Users"],
  ["/machines", "Machines"],
  ["/usage", "Usage"],
  ["/connectors", "Connectors"],
  ["/workspace", "Workspace"],
  ["/organization", "Organization"],
  ["/operator/workspaces", "All workspaces"],
];

const DOCS_URL = "https://docs.switchagents.ai/switch-rooms/getting-started";

export default function TopBar() {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const section = SECTION_LABELS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const crumbs = [session?.tenant?.name, section].filter(
    (crumb): crumb is string => Boolean(crumb),
  );

  return (
    <Stack
      direction="row"
      sx={{
        minHeight: "var(--top-bar-height)",
        flexShrink: 0,
        gap: 1,
        alignItems: "center",
        justifyContent: "space-between",
        color: "text.primary",
        pr: 1,
      }}
    >
      <Typography sx={{ fontSize: "0.9375rem", fontWeight: 500, letterSpacing: "-0.02em", px: { xs: 0.5, md: 2 }, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        Switch
        {crumbs.map((crumb, i) => (
          <Box component="span" key={i}>
            <Box component="span" sx={{ opacity: 0.4, mx: 1 }}>
              /
            </Box>
            <Box component="span" sx={{ fontWeight: i === crumbs.length - 1 ? 700 : 500 }}>
              {crumb}
            </Box>
          </Box>
        ))}
      </Typography>

      <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexShrink: 0 }}>
        <Tooltip title="All Switch services are reachable">
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.75, px: 1, display: { xs: "none", sm: "flex" } }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--hoot-success)",
              }}
            />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              System healthy
            </Typography>
          </Stack>
        </Tooltip>
        <Button
          color="inherit"
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          startIcon={<MenuBookOutlined sx={{ fontSize: 18 }} />}
          sx={{ fontWeight: 500 }}
        >
          Docs
        </Button>
      </Stack>
    </Stack>
  );
}
