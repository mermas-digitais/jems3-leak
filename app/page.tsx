import { DashboardPanel } from "../components/dashboard/dashboard-panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel operacional",
  description:
    "Visão principal da plataforma JEMS3 Leak com submissões, reviews e revisores.",
};

export default function Home() {
  return <DashboardPanel />;
}
