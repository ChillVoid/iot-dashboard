"""Strict wire models shared by device recovery and ordinary score submission."""
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .device_commands import UUID_PATTERN


class APIInput(BaseModel):
    model_config = {'extra': 'forbid'}

    @field_validator('*')
    @classmethod
    def valid_unicode(cls, value):
        if isinstance(value, str):
            try:
                value.encode('utf-8')
            except UnicodeEncodeError:
                raise ValueError('Invalid text encoding.') from None
        return value


class Placement(APIInput):
    candidate_x: int = Field(strict=True, ge=0, le=19)  # widest ruleset: matrix-v2, 20 columns
    candidate_width: int = Field(strict=True, ge=1, le=6)
    overlap_width: int = Field(strict=True, ge=0, le=6)
    locked_at_ms: int = Field(strict=True, ge=30, lt=60000)


class Result(APIInput):
    terminalId: str = Field(pattern=r'^[a-f0-9-]{36}$')
    rulesHash: str = Field(pattern=r'^[a-f0-9]{64}$')
    outcome: Literal['win', 'loss']
    durationMs: int = Field(strict=True, ge=0, le=60000)
    placements: list[Placement] = Field(max_length=17)  # most levels: matrix-v2


class BootRegistration(APIInput):
    bootId: str = Field(pattern=UUID_PATTERN)
    previousBootId: str | None = Field(default=None, pattern=UUID_PATTERN)
    storageId: str = Field(pattern=UUID_PATTERN)
    uptimeMs: int = Field(strict=True, ge=0, le=2**53-1)


class JournalEvent(APIInput):
    eventId: str = Field(pattern=UUID_PATTERN)
    sequence: int = Field(strict=True, ge=1, le=2**53-1)
    uptimeMs: int = Field(strict=True, ge=0, le=2**53-1)
    sessionId: str = Field(pattern=UUID_PATTERN)
    commandId: str = Field(pattern=UUID_PATTERN)
    expectedRevision: int = Field(strict=True, ge=1)
    phase: Literal['reserved', 'started', 'terminal', 'fenced_unstarted', 'fenced_interrupted']
    roundBootId: str | None = Field(default=None, pattern=UUID_PATTERN)
    startUptimeMs: int | None = Field(default=None, strict=True, ge=0, le=2**53-1)
    terminal: Result | None = None

    @model_validator(mode='after')
    def phase_fields(self):
        has_start = self.roundBootId is not None and self.startUptimeMs is not None
        if self.phase in ('started', 'terminal'):
            if not has_start:
                raise ValueError('A start marker and its boot are required.')
        elif self.roundBootId is not None or self.startUptimeMs is not None:
            raise ValueError('Unexpected start marker.')
        if (self.phase == 'terminal') != (self.terminal is not None):
            raise ValueError('Only terminal events contain a result.')
        return self


class RecoveryReason(APIInput):
    reason: str = Field(min_length=1, max_length=160, pattern=r'.*\S.*')
    expectedRevision: int = Field(strict=True, ge=1)


class RecoveryResolution(RecoveryReason):
    evidenceId: str = Field(pattern=UUID_PATTERN)
    action: Literal['recover_result', 'release_unstarted', 'void_interrupted']
