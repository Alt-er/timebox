import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuth from '@/hooks/useAuth';


export default function Settings() {
    const [interval, setInterval] = useState(0);

    const loginUser = useAuth();

    const handleSave = () => {
        // 在这里处理保存逻辑，例如将 interval 保存到本地存储或发送到服务器
        console.log('保存的时间间隔:', interval);
    };

    return (
        <div>
            <h1>设置</h1>
            <label>
                时间间隔:
                <input
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                />
            </label>
            <button onClick={handleSave}>保存</button>
        </div>
    );
}
