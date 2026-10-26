
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(
        String,
        ForeignKey("users.username"),
        nullable=False
    )
    content = Column(String, nullable=False, default="")
    media_url = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    public_id = Column(String, nullable=True)


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_username = Column(
        String,
        ForeignKey("users.username"),
        nullable=False
    )
    following_username = Column(
        String,
        ForeignKey("users.username"),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "follower_username",
            "following_username",
            name="unique_follow_pair"
        ),
    )
