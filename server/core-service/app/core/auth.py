from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status, Request
from app.models.user import User as UserModel
from app.db.database import get_db
import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def get_password_hash(password: str) -> str:
    try:
        # 确保输入是字符串类型
        if not isinstance(password, str):
            password = str(password)
            
        # 转换为字节类型
        password_bytes = password.encode('utf-8')
        
        # 生成哈希值
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        
        # 返回字符串格式的哈希值
        return hashed.decode('utf-8')
        
    except Exception as e:
        print(f"密码哈希出错: {str(e)}")
        raise ValueError(f"密码哈希失败: {str(e)}")

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(UserModel).filter(UserModel.username == username).first()
    
    if not user:
        return None
        
    try:
        if not verify_password(password, user.hashed_password):
            return None
    except Exception as e:
        print(f"Password verification error: {e}")  # 添加调试信息
        return None
        
    return user

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def login_user(request: Request, user: UserModel):
    request.session["user_id"] = user.id

def logout_user(request: Request):
    request.session.pop("user_id", None) 