import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
import CenterFocusStrong from "@mui/icons-material/CenterFocusStrong";
import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";

export const MIN_GRAPH_ZOOM = 0.25;
export const MAX_GRAPH_ZOOM = 6;
export const clampGraphZoom = (value: number) => Math.min(MAX_GRAPH_ZOOM, Math.max(MIN_GRAPH_ZOOM, value));

interface Props {
  zoom: number;
  disabled?: boolean;
  onZoom: (value: number) => void;
  onFit: () => void;
}

/** The same accessible viewport controls for both force-graph views. */
export default function GraphControls({ zoom, disabled = false, onZoom, onFit }: Props) {
  return (
    <Box role="group" aria-label="Diagram controls" sx={{
      position: "absolute", right: 16, bottom: 16, zIndex: 3,
      display: "flex", alignItems: "center", gap: 0.25, p: 0.5,
      bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
      borderRadius: "12px", boxShadow: "var(--hoot-shadow-popover)",
      "& .MuiIconButton-root": { width: 38, height: 38, borderRadius: "8px" },
    }}>
      <Tooltip title="Zoom out"><span><IconButton aria-label="Zoom out" disabled={disabled || zoom <= MIN_GRAPH_ZOOM + 0.001} onClick={() => onZoom(clampGraphZoom(zoom / 1.25))}><Remove fontSize="small" /></IconButton></span></Tooltip>
      <Typography component="output" aria-label="Diagram zoom" aria-live="off" sx={{ minWidth: 52, textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>{Math.round(zoom * 100)}%</Typography>
      <Tooltip title="Zoom in"><span><IconButton aria-label="Zoom in" disabled={disabled || zoom >= MAX_GRAPH_ZOOM - 0.001} onClick={() => onZoom(clampGraphZoom(zoom * 1.25))}><Add fontSize="small" /></IconButton></span></Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Fit diagram to view"><span><IconButton aria-label="Fit diagram to view" disabled={disabled} onClick={onFit}><CenterFocusStrong fontSize="small" /></IconButton></span></Tooltip>
    </Box>
  );
}
