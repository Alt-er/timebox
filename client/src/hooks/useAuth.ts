import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 定义 LoginUser 类型
type LoginUser = {
  username: string;
};

export const getLoginUser = (): LoginUser | null => {
  const loginUserStr = localStorage.getItem('loginUser');
  return loginUserStr ? JSON.parse(loginUserStr) : null;
}

export const setLoginUser = (user: LoginUser) => {
  localStorage.setItem('loginUser', JSON.stringify(user));
}

const useAuth = () => {
  const navigate = useNavigate();
  const loginUser: LoginUser | null = getLoginUser();

  useEffect(() => {
    if (!loginUser) {
      navigate('/login');
    }
  }, [loginUser, navigate]);

  return loginUser;
};

export default useAuth; 