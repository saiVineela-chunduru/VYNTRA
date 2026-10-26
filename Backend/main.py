
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from models import User, Post

app = FastAPI(title="Vyntra API")

Base.metadata.create_all(bind=engine)

password_hash = PasswordHash.recommended()

# Allow local development and deployed Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
        "https://vyntra-ebon.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserSignup(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class PostCreate(BaseModel):
    username: str
    content: str


@app.get("/")
def home():
    return {"message": "Vyntra API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/signup")
def signup(user: UserSignup):
    db: Session = SessionLocal()

    try:
        existing_user = db.query(User).filter(
            (User.username == user.username)
            | (User.email == user.email)
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username or email already registered."
            )

        new_user = User(
            username=user.username,
            email=user.email,
            hashed_password=password_hash.hash(user.password)
        )

        db.add(new_user)
        db.commit()

        return {
            "message": "Account created successfully!"
        }

    finally:
        db.close()


@app.post("/login")
def login(user: UserLogin):
    db: Session = SessionLocal()

    try:
        existing_user = db.query(User).filter(
            User.username == user.username
        ).first()

        if not existing_user or not password_hash.verify(
            user.password,
            existing_user.hashed_password
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )

        return {
            "message": "Login successful!",
            "username": existing_user.username
        }

    finally:
        db.close()


@app.post("/posts")
def create_post(post: PostCreate):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(
            User.username == post.username
        ).first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        if not post.content.strip():
            raise HTTPException(
                status_code=400,
                detail="Post content cannot be empty."
            )

        new_post = Post(
            username=user.username,
            content=post.content.strip()
        )

        db.add(new_post)
        db.commit()
        db.refresh(new_post)

        return {
            "id": new_post.id,
            "username": new_post.username,
            "content": new_post.content,
            "message": "Post created successfully!"
        }

    finally:
        db.close()


@app.get("/posts")
def get_posts():
    db: Session = SessionLocal()

    try:
        posts = db.query(Post).order_by(
            Post.id.desc()
        ).all()

        return [
            {
                "id": post.id,
                "username": post.username,
                "content": post.content
            }
            for post in posts
        ]

    finally:
        db.close()
