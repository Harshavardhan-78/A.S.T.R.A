from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ParkingNode, ParkingSensor, ParkingSlot, ParkingZone


class DigitalTwinService:
    @staticmethod
    async def get_layout(db: AsyncSession) -> dict:
        z_res = await db.execute(select(ParkingZone))
        zones = z_res.scalars().all()

        s_res = await db.execute(select(ParkingSlot))
        slots = s_res.scalars().all()

        sen_res = await db.execute(select(ParkingSensor))
        sensors = sen_res.scalars().all()

        n_res = await db.execute(select(ParkingNode))
        nodes = n_res.scalars().all()

        floors = list({z.floor for z in zones if z.floor})

        return {
            "floors": floors,
            "zones": [
                {
                    "id": z.id,
                    "name": z.name,
                    "floor": z.floor,
                    "description": z.description,
                    "x": z.x_coord,
                    "y": z.y_coord,
                    "width": z.width,
                    "height": z.height,
                }
                for z in zones
            ],
            "slots": [
                {
                    "id": s.id,
                    "zone_id": s.zone_id,
                    "slot_number": s.slot_number,
                    "status": s.status,
                    "slot_type": s.slot_type,
                    "x": s.x_coord,
                    "y": s.y_coord,
                    "width": s.width,
                    "height": s.height,
                }
                for s in slots
            ],
            "sensors": [
                {
                    "id": sen.id,
                    "slot_id": sen.slot_id,
                    "sensor_code": sen.sensor_code,
                    "sensor_type": sen.sensor_type,
                    "is_active": sen.is_active,
                    "last_ping": sen.last_ping,
                }
                for sen in sensors
            ],
            "nodes": [
                {
                    "id": n.id,
                    "zone_id": n.zone_id,
                    "node_type": n.node_type,
                    "x": n.x_coord,
                    "y": n.y_coord,
                    "label": n.label,
                }
                for n in nodes
            ],
        }

    @staticmethod
    async def get_floors(db: AsyncSession) -> list[str]:
        z_res = await db.execute(select(ParkingZone))
        zones = z_res.scalars().all()
        return list({z.floor for z in zones if z.floor})

    @staticmethod
    async def get_sensors(db: AsyncSession) -> list[dict]:
        sen_res = await db.execute(select(ParkingSensor))
        sensors = sen_res.scalars().all()
        return [
            {
                "id": sen.id,
                "slot_id": sen.slot_id,
                "sensor_code": sen.sensor_code,
                "sensor_type": sen.sensor_type,
                "is_active": sen.is_active,
                "last_ping": sen.last_ping,
            }
            for sen in sensors
        ]

    @staticmethod
    async def get_nodes(db: AsyncSession) -> list[dict]:
        n_res = await db.execute(select(ParkingNode))
        nodes = n_res.scalars().all()
        return [
            {
                "id": n.id,
                "zone_id": n.zone_id,
                "node_type": n.node_type,
                "x": n.x_coord,
                "y": n.y_coord,
                "label": n.label,
            }
            for n in nodes
        ]
