// app/page.js
import Header from "./components/Header";
import FeedbackSection from "./components/FeedbackSection";
import ChatWidget from "./components/ChatWidget";
import "./globals.css";

export default function HomePage() {
  return (
    <div>
      <Header />
      <main>
        <FeedbackSection />
      </main>
      <ChatWidget />
    </div>
  );
}
