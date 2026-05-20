import React, { useState, useEffect, useRef } from "react";
import { IndiaMapProps, defaultMapStyle } from "@/types/MapTypes";
import { fetchSVGContent } from "@/utils/mapUtils";
import stateColors from '@/data/stateColors';
import './IndiaMap.css';

interface HoverInfo {
  name: string;
  id: string;
  title: string;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({
  mapStyle = defaultMapStyle,
  stateData = [],
  onStateHover,
  onStateClick,
  selectionSyncKey = null,
}) => {
  const [svgContent, setSvgContent] = useState<string>("");
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Store original colors of paths
  const originalColors = useRef<Map<string, string>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSVG = async () => {
      const content = await fetchSVGContent();
      if (content) setSvgContent(content);
    };
    loadSVG();
  }, []);

  // Initialize the map once the SVG is loaded
  useEffect(() => {
    if (!svgContent || !mapContainerRef.current) return;

    const applyStateColors = () => {
      const paths = mapContainerRef.current?.querySelectorAll("path");
      if (!paths) return;

      paths.forEach((path) => {
        const pathElement = path as SVGPathElement;
        const id = pathElement.getAttribute("id") || "";
        const stateInfo = stateData.find((s) => s.id === id);
        const fillColor = stateColors[id] || mapStyle.backgroundColor || '#ffffff';

        try {
          pathElement.setAttribute("fill", fillColor);
          pathElement.setAttribute("stroke", mapStyle.stroke || "#000000");
          pathElement.setAttribute("stroke-width", String(mapStyle.strokeWidth || 1));

          const stateName = stateInfo?.customData?.name || stateInfo?.name;
          if (stateName) {
            pathElement.setAttribute("data-name", stateName);
            pathElement.setAttribute("title", stateName);
          }

          originalColors.current.set(id, fillColor);
        } catch {
          // Ignore DOM exceptions
        }
      });
    };

    setTimeout(applyStateColors, 50);

    const observer = new MutationObserver(applyStateColors);
    observer.observe(mapContainerRef.current, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [svgContent, mapStyle, stateData]);

  // Reset every path to the base palette when selection changes or clears (no “stuck” hover / no extra selected fill).
  useEffect(() => {
    if (!svgContent || !mapContainerRef.current) return;
    const paths = mapContainerRef.current.querySelectorAll("path");
    paths.forEach((path) => {
      const pathElement = path as SVGPathElement;
      const id = pathElement.getAttribute("id") || "";
      const fillColor = stateColors[id] || mapStyle.backgroundColor || "#ffffff";
      try {
        pathElement.setAttribute("fill", fillColor);
        originalColors.current.set(id, fillColor);
      } catch {
        /* ignore */
      }
    });
  }, [selectionSyncKey, svgContent, mapStyle.backgroundColor]);

  const handleMouseEnter = (e: React.MouseEvent, element: SVGPathElement) => {
    const pathId = element.getAttribute("id") || "";
    const title = element.getAttribute("title") || element.getAttribute("data-name") || "";

    setHoverInfo({ name: title, id: pathId, title });
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
    onStateHover?.(pathId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showTooltip) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
    setShowTooltip(false);
    onStateHover?.("");
  };

  const currentStateData = hoverInfo ? stateData.find((s) => s.id === hoverInfo.id) : undefined;

  // Get tooltip styles
  const getTooltipStyles = () => {
    return {
      position: "fixed" as const,
      left: `${tooltipPos.x + 15}px`,
      top: `${tooltipPos.y + 15}px`,
      backgroundColor: mapStyle.tooltipConfig?.backgroundColor || "rgba(0, 0, 0, 0.8)",
      color: mapStyle.tooltipConfig?.textColor || "#ffffff",
      padding: "8px 12px",
      borderRadius: "4px",
      fontSize: "14px",
      zIndex: 1000,
      pointerEvents: "none" as const,
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
      minWidth: "150px",
      maxWidth: "250px",
    };
  };


  return (
    <div
      className="india-map-container"
      onMouseMove={handleMouseMove}
    >
      {showTooltip && hoverInfo && (
        <div className="state-tooltip" style={getTooltipStyles()}>
          <div className="state-tooltip-header">
            {hoverInfo.title || currentStateData?.customData?.name || hoverInfo.id}
          </div>
          {currentStateData?.customData && (
            <div className="state-tooltip-custom-data">
              {Object.entries(currentStateData.customData)
                .filter(([key]) => key !== "name" && key !== "region")
                .map(([key, value]) => (
                  <div key={key} className="state-tooltip-row">
                    <span>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="india-map-svg-container"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onMouseOver={(e) => {
          const path = e.target as SVGPathElement;
          if (path?.tagName === "path") {
            const id = path.getAttribute("id") || "";
            const original = originalColors.current.get(id) || mapStyle.backgroundColor || "#ffffff";
            path.setAttribute("fill", mapStyle.hoverColor || original);
            handleMouseEnter(e, path);
          }
        }}
        onClick={(e) => {
          const path = e.target as SVGPathElement;
          if (path.tagName === "path") {
            const id = path.getAttribute("id") || "";
            onStateClick?.(id);
            const base = originalColors.current.get(id) || stateColors[id] || mapStyle.backgroundColor || "#ffffff";
            path.setAttribute("fill", base);
          }
        }}
        onMouseOut={(e) => {
          const path = e.target as SVGPathElement;
          if (path?.tagName === "path") {
            const id = path.getAttribute("id") || "";
            const original = originalColors.current.get(id) || mapStyle.backgroundColor || "#ffffff";
            path.setAttribute("fill", original);
          }
          handleMouseLeave();
        }}
      />
    </div>
  );
};
