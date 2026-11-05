import ArrowBack from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import GraphControls, { MIN_GRAPH_ZOOM, MAX_GRAPH_ZOOM } from "../../components/GraphControls";
import { useNavigate } from "react-router";
import { useRoomGraph, useRoomGroups, useRooms } from "../../data/hooks";
import { branchColor, buildGroupIndex, topAncestor } from "./groupTree";
import { RoomFilters, filterRooms, useRoomFilterState } from "./roomFilters";
import { useGraphCanvasTheme } from "../graphCanvasTheme";

interface GraphNode {
  id: string;
  label: string;
  description: string;
  degree: number;
  isolated: boolean;
  // Colour assigned by the room's top-level ancestor group (or null = ungrouped).
  color: string;
  grouped: boolean;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface LegendEntry {
  id: string;
  name: string;
  color: string;
}

const UNGROUPED_COLOR = "#5A5F66";

export default function RoomsGraphPage() {
  const navigate = useNavigate();
  const filters = useRoomFilterState();

  // Nodes come from the same room list the table uses (so the filters apply
  // identically); the link edges come from the link graph. Group colouring
  // uses the group tree.
  const {
    data: rooms,
    loading: roomsLoading,
    error: roomsError,
  } = useRooms(filters.debouncedSearch || undefined, filters.showArchived);
  const { data: groups } = useRoomGroups();
  const { data: graph, loading: graphLoading, error: graphError } = useRoomGraph();

  const loading = roomsLoading || graphLoading;
  const error = roomsError ?? graphError;

  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const needsFit = useRef(true);
  const [zoom, setZoom] = useState(1);
  const motionDuration = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const groupList = useMemo(() => groups ?? [], [groups]);

  const filteredRooms = useMemo(
    () => filterRooms(rooms ?? [], groupList, filters),
    [
      rooms,
      groupList,
      filters.showArchived,
      filters.bridgeFilter,
      filters.userFilter,
      filters.groupFilter,
      filters.ownerFilter,
    ],
  );

  const { nodes, links, legend } = useMemo<{
    nodes: GraphNode[];
    links: GraphLink[];
    legend: LegendEntry[];
  }>(() => {
    const visibleIds = new Set(filteredRooms.map((r) => r.id));
    // Keep only links whose endpoints are both visible under the current filters.
    const edges = (graph?.links ?? []).filter(
      (l) => visibleIds.has(l.source_room_id) && visibleIds.has(l.target_room_id),
    );

    const degree = new Map<string, number>();
    for (const r of filteredRooms) degree.set(r.id, 0);
    for (const l of edges) {
      degree.set(l.source_room_id, (degree.get(l.source_room_id) ?? 0) + 1);
      degree.set(l.target_room_id, (degree.get(l.target_room_id) ?? 0) + 1);
    }

    const byId = buildGroupIndex(groupList);
    // Legend: one entry per top-level group actually used by some visible room.
    const usedTopIds = new Set<string>();
    const nodeList: GraphNode[] = filteredRooms.map((r) => {
      const top = r.group_id ? topAncestor(r.group_id, byId) : null;
      if (top) usedTopIds.add(top.id);
      return {
        id: r.id,
        label: r.name,
        description: r.description,
        degree: degree.get(r.id) ?? 0,
        isolated: (degree.get(r.id) ?? 0) === 0,
        color: r.group_id ? branchColor(r.group_id, byId) : UNGROUPED_COLOR,
        grouped: !!r.group_id,
      };
    });
    const linkList: GraphLink[] = edges.map((l) => ({
      source: l.source_room_id,
      target: l.target_room_id,
    }));
    const legendList: LegendEntry[] = groupList
      .filter((g) => !g.parent_group_id && usedTopIds.has(g.id))
      .map((g) => ({ id: g.id, name: g.name, color: branchColor(g.id, byId) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (filteredRooms.some((r) => !r.group_id)) {
      legendList.push({ id: "__ungrouped", name: "Ungrouped", color: UNGROUPED_COLOR });
    }
    return { nodes: nodeList, links: linkList, legend: legendList };
  }, [filteredRooms, graph, groupList]);

  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force("charge")?.strength(-300);
    fgRef.current.d3Force("link")?.distance(120);
    needsFit.current = true;
  }, [nodes.length, links.length]);

  const fitDiagram = useCallback(() => {
    const graph = fgRef.current;
    const bounds = graph?.getGraphBbox();
    if (!graph || !bounds) return;
    const scale = Math.min(2, Math.max(MIN_GRAPH_ZOOM, Math.min(
      (dimensions.width - 80) / Math.max(120, bounds.x[1] - bounds.x[0] + 120),
      (dimensions.height - 120) / Math.max(120, bounds.y[1] - bounds.y[0] + 100),
    )));
    graph.centerAt((bounds.x[0] + bounds.x[1]) / 2, (bounds.y[0] + bounds.y[1]) / 2, motionDuration());
    graph.zoom(scale, motionDuration());
  }, [dimensions]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);
  const canvas = useGraphCanvasTheme();

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x = 0, y = 0, label, isolated, degree, color } = node;
      const radius = Math.min(14, 6 + Math.sqrt(degree) * 2);

      if (!isolated && degree > 1) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = `${color}25`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = `${color}${isolated ? "50" : "90"}`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isolated ? 0.8 : 1.4;
      ctx.stroke();

      // Font in graph coordinates: scales with zoom in lockstep with the node.
      const fontGraphUnits = Math.max(radius * 0.65, 12 / globalScale);
      ctx.font = `${fontGraphUnits}px ${canvas.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isolated ? canvas.labelMuted : canvas.label;
      const truncated = label.length > 32 ? label.slice(0, 31) + "…" : label;
      ctx.fillText(truncated, x, y + radius + fontGraphUnits * 0.4);
    },
    [canvas],
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      navigate(`/rooms/${node.id}`);
    },
    [navigate],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
        <IconButton aria-label="Back to rooms" onClick={() => navigate("/rooms")} size="small">
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Rooms graph
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {`${nodes.length} ${nodes.length === 1 ? "room" : "rooms"} · ${links.length} ${links.length === 1 ? "link" : "links"} · ${legend.length} ${legend.length === 1 ? "group" : "groups"}`}
        </Typography>
      </Stack>

      <RoomFilters rooms={rooms ?? []} groups={groupList} state={filters} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: { xs: 360, md: 400 },
          flexShrink: 0,
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: canvas.background,
          position: "relative",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {legend.length > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 2,
              p: 1.25,
              borderRadius: "12px",
              backgroundColor: "background.paper",
              boxShadow: "var(--hoot-shadow-popover)",
              border: "1px solid",
              borderColor: "divider",
              maxWidth: 220,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.75 }}
            >
              Groups
            </Typography>
            <Stack spacing={0.5}>
              {legend.map((entry) => (
                <Stack
                  key={entry.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: entry.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.primary" }}>
                    {entry.name}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
        {!loading && nodes.length === 0 && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No rooms.
            </Typography>
          </Box>
        )}
        <GraphControls zoom={zoom} disabled={loading || nodes.length === 0}
          onZoom={(value) => fgRef.current?.zoom(value, motionDuration())}
          onFit={fitDiagram} />
        <Box sx={{ position: "absolute", left: 16, bottom: 20, zIndex: 2, display: { xs: "none", md: "block" }, pointerEvents: "none" }}>
          <Typography variant="caption" color="text.secondary">Drag to explore · Scroll or use + / − to zoom</Typography>
        </Box>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={canvas.background}
          nodeRelSize={1}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode;
            const r = Math.min(14, 6 + Math.sqrt(n.degree) * 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={() => canvas.link}
          linkWidth={1}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(n) => handleNodeClick(n as GraphNode)}
          nodeLabel={(n) => {
            const node = n as GraphNode;
            return node.description
              ? `${node.label}\n${node.description}`
              : node.label;
          }}
          cooldownTicks={120}
          onEngineStop={() => {
            if (needsFit.current) { needsFit.current = false; fitDiagram(); }
          }}
          minZoom={MIN_GRAPH_ZOOM}
          maxZoom={MAX_GRAPH_ZOOM}
          onZoom={({ k }) => setZoom(k)}
          enableZoomInteraction
          enablePanInteraction
        />
      </Box>
    </Box>
  );
}
