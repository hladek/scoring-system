# Import all models to ensure they're registered with SQLAlchemy
from .users import User
from .teams import Team
from .competitions import Competition
from .matches import Match
from .results import Result
from .penalties import Penalty
from .timer import Timer
from .split_times import SplitTime
from . import user_teams

