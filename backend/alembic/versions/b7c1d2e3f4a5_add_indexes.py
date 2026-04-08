"""add indexes on foreign keys and filter columns

Revision ID: b7c1d2e3f4a5
Revises: f8933725c180
Create Date: 2026-04-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op


revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, None] = 'f8933725c180'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_devices_home_id', 'devices', ['home_id'])
    op.create_index('ix_devices_room_id', 'devices', ['room_id'])
    op.create_index('ix_devices_manufacturer_id', 'devices', ['manufacturer_id'])
    op.create_index('ix_devices_protocol', 'devices', ['protocol'])
    op.create_index('ix_devices_device_type', 'devices', ['device_type'])
    op.create_index('ix_devices_pairing_code', 'devices', ['pairing_code'])
    op.create_index('ix_rooms_home_id', 'rooms', ['home_id'])
    op.create_index('ix_attachments_device_id', 'attachments', ['device_id'])
    op.create_index('ix_custom_fields_device_id', 'custom_fields', ['device_id'])


def downgrade() -> None:
    op.drop_index('ix_custom_fields_device_id', table_name='custom_fields')
    op.drop_index('ix_attachments_device_id', table_name='attachments')
    op.drop_index('ix_rooms_home_id', table_name='rooms')
    op.drop_index('ix_devices_pairing_code', table_name='devices')
    op.drop_index('ix_devices_device_type', table_name='devices')
    op.drop_index('ix_devices_protocol', table_name='devices')
    op.drop_index('ix_devices_manufacturer_id', table_name='devices')
    op.drop_index('ix_devices_room_id', table_name='devices')
    op.drop_index('ix_devices_home_id', table_name='devices')
