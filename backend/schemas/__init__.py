# Import all schemas and rebuild models with forward references
from . import users, teams, competitions, matches, results, penalties

# Rebuild models with forward references for Pydantic V2
from .matches import MatchResponse
from .results import ResultResponse
from .penalties import PenaltyResponse
from .competitions import CompetitionResponse

# Rebuild models to resolve forward references
try:
    MatchResponse.model_rebuild()
    ResultResponse.model_rebuild()
    PenaltyResponse.model_rebuild()
    CompetitionResponse.model_rebuild()
except Exception:
    pass  # Models might already be rebuilt

