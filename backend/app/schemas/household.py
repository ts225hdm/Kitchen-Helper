import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class HouseholdCreate(BaseModel):
    name: str


class HouseholdMemberOut(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    role: str
    joined_at: datetime
    model_config = {"from_attributes": True}


class HouseholdOut(BaseModel):
    id: uuid.UUID
    name: str
    invite_code: str
    created_at: datetime
    members: List[HouseholdMemberOut] = []
    model_config = {"from_attributes": True}


class JoinHouseholdRequest(BaseModel):
    invite_code: str
