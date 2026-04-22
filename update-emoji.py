import os
import re

# 需要更新的文件
files_to_update = [
    'app/protocol/arp/page.tsx',
    'app/protocol/bgp/page.tsx',
    'app/protocol/dns/page.tsx',
    'app/protocol/http/page.tsx',
    'app/protocol/icmp/page.tsx',
    'app/protocol/ip/page.tsx',
    'app/protocol/ospf/page.tsx',
    'app/protocol/rip/page.tsx',
    'app/protocol/stp/page.tsx',
    'app/protocol/vrrp/page.tsx',
]

base_path = r'd:\BUZZ\Vibe\001\netviz'

for file_path in files_to_update:
    full_path = os.path.join(base_path, file_path)
    
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. 添加 React 和 Emoji 导入
    if 'import React' not in content:
        content = content.replace(
            "import { useState, useEffect, useRef } from 'react';",
            "import React, { useState, useEffect, useRef } from 'react';\nimport Emoji from '@/components/Emoji';"
        )
    
    # 2. 修改 StepInfo 接口
    content = re.sub(
        r'icon: string;',
        'icon: React.ReactNode;',
        content
    )
    
    # 3. 将所有 icon: 'xxx' 替换为 icon: <Emoji label="xxx" />
    # 匹配 icon: 后面跟各种 emoji 或文本
    def replace_icon(match):
        icon_value = match.group(1)
        return f'icon: <Emoji label="{icon_value}" />,'
    
    content = re.sub(r"icon:\s*'([^']+)',", replace_icon, content)
    
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated: {file_path}")

print("\nAll files updated!")
