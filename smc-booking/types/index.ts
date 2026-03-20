export type Room = {
  id: string;
  name: "SMC 601" | "SMC 605";
  capacity: number;
  description: string;
  amenities: string[];
};

export type Equipment = "bi_machine" | "visual_system" | "audio_system";

export const EQUIPMENT_OPTIONS: { id: Equipment; label: string; iconName: string }[] = [
  { id: "bi_machine",    label: "เครื่อง BI", iconName: "BarChart2" },
  { id: "visual_system", label: "ระบบภาพ",    iconName: "Projector" },
  { id: "audio_system",  label: "ระบบเสียง",  iconName: "Volume2"   },
];

export type Reservation = {
  id: string;
  user_id: string;
  room_ids: string[];
  room_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  equipment: Equipment[];
  status: "confirmed" | "cancelled";
  created_at: string;
  user_email?: string;
  user_name?: string;
};

export const TIME_OPTIONS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00",
];

export const ROOMS: Room[] = [
  {
    id: "smc-601",
    name: "SMC 601",
    capacity: 50,
    description: "ห้องประชุมขนาดกลาง ชั้น 6",
    amenities: ["โปรเจกเตอร์", "ไวท์บอร์ด", "WiFi", "เครื่องปรับอากาศ"],
  },
  {
    id: "smc-605",
    name: "SMC 605",
    capacity: 50,
    description: "ห้องประชุมขนาดใหญ่ ชั้น 6",
    amenities: ["โปรเจกเตอร์", "ไวท์บอร์ด", "WiFi", "เครื่องปรับอากาศ", "ระบบเสียง"],
  },
];
