import {Baby,Briefcase,Bus,Car,Coffee,Flame,Gift,GraduationCap,Heart,Home,Landmark,Phone,Pill,Plane,ReceiptText,Shirt,ShoppingCart,Utensils,Wifi,Zap,type LucideProps} from 'lucide-react';
import type {IconKey} from '@/lib/category-style';
const map:Record<IconKey,React.ComponentType<LucideProps>>={receipt:ReceiptText,cart:ShoppingCart,utensils:Utensils,home:Home,car:Car,bus:Bus,phone:Phone,wifi:Wifi,pill:Pill,heart:Heart,gift:Gift,zap:Zap,flame:Flame,graduation:GraduationCap,briefcase:Briefcase,baby:Baby,coffee:Coffee,shirt:Shirt,landmark:Landmark,plane:Plane};
export default function CategoryIcon({icon,...props}:{icon?:string}&LucideProps){const Icon=map[icon as IconKey]??ReceiptText;return <Icon {...props}/>;}
