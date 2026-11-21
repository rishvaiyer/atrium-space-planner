import { itemDims } from '../geometry'
import type { ProjectFile } from '../project'

export function PlanPreview({ project }: { project: Pick<ProjectFile, 'name' | 'room' | 'items'> }) {
  const { room, items } = project
  return (
    <svg
      className="plan-preview"
      viewBox={`${room.originX - 0.5} ${room.originZ - 0.5} ${room.width + 1} ${room.depth + 1}`}
      role="img"
      aria-label={`Floor plan of ${project.name}`}
    >
      <rect
        x={room.originX}
        y={room.originZ}
        width={room.width}
        height={room.depth}
        fill="var(--plan-paper, #f0ece2)"
      />
      {items.map((item) => {
        const { w, d, def } = itemDims(item)
        return (
          <rect
            key={item.id}
            x={item.x - w / 2}
            y={item.z - d / 2}
            width={w}
            height={d}
            rx={Math.min(0.08, w / 8)}
            transform={`rotate(${(item.rotation * 180) / Math.PI} ${item.x} ${item.z})`}
            fill={item.finish ?? (def.isSeat ? '#78846a' : '#b39b7d')}
            stroke="#5c6254"
            strokeWidth=".018"
          />
        )
      })}
      {room.walls.map((wall) => (
        <line
          key={wall.id}
          x1={wall.ax}
          y1={wall.az}
          x2={wall.bx}
          y2={wall.bz}
          stroke="#383d31"
          strokeWidth=".14"
        />
      ))}
    </svg>
  )
}
