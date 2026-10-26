import os
import cloudinary
import cloudinary.uploader

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from database import Base, engine, SessionLocal
from models import User, Post


app = FastAPI(title="Vyntra API")

Base.metadata.create_all(bind=engine)

# Safely add new columns to an existing posts table.
# Existing posts are preserved.
with engine.begin() as connection:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("posts")
    }

    if "media_url" not in columns:
        connection.execute(
            text("ALTER TABLE posts ADD COLUMN media_url VARCHAR")
        )

    if "media_type" not in columns:
        connection.execute(
            text("ALTER TABLE posts ADD COLUMN media_type VARCHAR")
        )

    if "public_id" not in columns:
        connection.execute(
            text("ALTER TABLE posts ADD COLUMN public_id VARCHAR")
        )

password_hash = PasswordHash.recommended()


def configure_cloudinary():
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )


configure_cloudinary()


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
    content: str = ""


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

        return {"message": "Account created successfully!"}

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

        content = post.content.strip()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Post content cannot be empty. Use /upload for media posts."
            )

        new_post = Post(
            username=user.username,
            content=content
        )

        db.add(new_post)
        db.commit()
        db.refresh(new_post)

        return {
            "id": new_post.id,
            "username": new_post.username,
            "content": new_post.content,
            "media_url": new_post.media_url,
            "media_type": new_post.media_type,
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
                "content": post.content or "",
                "media_url": post.media_url,
                "media_type": post.media_type
            }
            for post in posts
        ]

    finally:
        db.close()


@app.post("/upload")
async def upload_media(
    username: str = Form(...),
    file: UploadFile = File(...),
    content: str = Form("")
):
    try:
        # Verify user
        db: Session = SessionLocal()

        try:
            user = db.query(User).filter(
                User.username == username
            ).first()

            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="User not found."
                )

            saved_username = user.username

        finally:
            db.close()

        # Verify Cloudinary credentials
        if not all([
            os.getenv("CLOUDINARY_CLOUD_NAME"),
            os.getenv("CLOUDINARY_API_KEY"),
            os.getenv("CLOUDINARY_API_SECRET")
        ]):
            raise HTTPException(
                status_code=500,
                detail="Cloudinary is not configured."
            )

        content_type = file.content_type or ""

        if content_type.startswith("image/"):
            media_type = "image"
            max_size = 10 * 1024 * 1024
        elif content_type.startswith("video/"):
            media_type = "video"
            max_size = 50 * 1024 * 1024
        else:
            raise HTTPException(
                status_code=400,
                detail="Only image and video files are allowed."
            )

        data = await file.read(max_size + 1)

        if not data:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )

        if len(data) > max_size:
            raise HTTPException(
                status_code=413,
                detail="File too large. Images: 10 MB, videos: 50 MB."
            )

        configure_cloudinary()

        result = cloudinary.uploader.upload(
            data,
            resource_type=media_type,
            folder="vyntra",
            timeout=60
        )

        media_url = result["secure_url"]
        public_id = result["public_id"]

        # Save media post in the database
        db = SessionLocal()

        try:
            new_post = Post(
                username=saved_username,
                content=content.strip(),
                media_url=media_url,
                media_type=media_type,
                public_id=public_id
            )

            db.add(new_post)
            db.commit()
            db.refresh(new_post)

            return {
                "message": "Media uploaded and post saved successfully!",
                "id": new_post.id,
                "username": new_post.username,
                "content": new_post.content,
                "media_type": new_post.media_type,
                "media_url": new_post.media_url,
                "public_id": new_post.public_id
            }

        except Exception:
            db.rollback()

            # Avoid leaving an orphaned Cloudinary asset if DB save fails
            try:
                cloudinary.uploader.destroy(
                    public_id,
                    resource_type=media_type
                )
            except Exception as cleanup_error:
                print("Cloudinary cleanup error:", repr(cleanup_error))

            raise HTTPException(
                status_code=500,
                detail="Media uploaded but database save failed."
            )

        finally:
            db.close()

    except HTTPException:
        raise

    except Exception as e:
        print("Media upload error:", repr(e))

        raise HTTPException(
            status_code=502,
            detail="Media upload failed. Check the backend terminal."
        )

    finally:
        await file.close()