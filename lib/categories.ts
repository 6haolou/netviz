// 分类配置数据
export interface Protocol {
  title: string;
  desc: string;
  href: string;
  icon: string;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  protocols: Protocol[];
}

export const categories: Category[] = [
  {
    id: 'application',
    title: '应用层协议',
    description: '应用层直接为用户应用程序提供网络服务，包括 HTTP、DNS、SMTP 等常见协议。',
    protocols: [
      {
        title: 'TCP 协议',
        desc: '了解 TCP 三次握手、四次挥手和流量控制的工作原理',
        href: '/protocol/tcp',
        icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      },
      {
        title: 'HTTP 协议',
        desc: '了解 HTTP 请求 - 响应流程、方法和状态码',
        href: '/protocol/http',
        icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      },
      {
        title: 'DNS 协议',
        desc: '了解 DNS 域名解析的工作原理和查询过程',
        href: '/protocol/dns',
        icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      },
    ],
  },
  {
    id: 'network',
    title: '网络层协议',
    description: '网络层负责数据包的路由和转发，包括 IP、ICMP、ARP 等基础协议。',
    protocols: [
      {
        title: 'IP 协议',
        desc: '了解 IP 协议的工作原理、子网掩码和路由',
        href: '/protocol/ip',
        icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      },
      {
        title: 'ARP 协议',
        desc: '了解 ARP 地址解析协议的工作原理',
        href: '/protocol/arp',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      },
      {
        title: 'ICMP 协议',
        desc: '了解 ICMP 协议的工作原理和 ping 命令',
        href: '/protocol/icmp',
        icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
    ],
  },
  {
    id: 'routing',
    title: '路由协议',
    description: '路由协议用于在网络中传播路由信息，包括 OSPF、BGP、RIP 等动态路由协议。',
    protocols: [
      {
        title: 'OSPF 协议',
        desc: '了解 OSPF 开放式最短路径优先协议的工作原理',
        href: '/protocol/ospf',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      {
        title: 'BGP 协议',
        desc: '了解 BGP 边界网关协议的工作原理和路径矢量',
        href: '/protocol/bgp',
        icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        title: 'RIP 协议',
        desc: '了解 RIP 路由信息协议的距离矢量算法',
        href: '/protocol/rip',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
    ],
  },
  {
    id: 'availability',
    title: '高可用性协议',
    description: '高可用性协议确保网络的可靠性和冗余，包括 VRRP、MSTP、STP 等协议。',
    protocols: [
      {
        title: 'VRRP 协议',
        desc: '了解 VRRP 虚拟路由器冗余协议的工作原理',
        href: '/protocol/vrrp',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        title: 'MSTP 协议',
        desc: '了解 MSTP 多实例生成树协议的负载均衡',
        href: '/protocol/mstp',
        icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      },
      {
        title: 'STP 协议',
        desc: '了解 STP 生成树协议如何防止网络环路',
        href: '/protocol/stp',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      },
    ],
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find(cat => cat.id === id);
}

export function getAllCategories(): Category[] {
  return categories;
}
