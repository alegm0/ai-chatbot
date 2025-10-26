"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../styles/Header.module.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Image
          src="/sunsets-logo-white.png"
          alt="Sunsets Logo"
          fill
          className={styles.logo}
        />
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.menuToggle} ${isOpen ? styles.menuToggleOpen : ""}`}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      <nav className={`${styles.nav} ${isOpen ? styles.open : ""}`}>
        <div className={styles.menuContent}>
          <ul className={styles.navList}>
            <li className={styles.navItem}><a href="#">Home</a></li>
            <li className={styles.navItem}><a href="#">Eat</a></li>
            <li className={styles.navItem}><a href="#">Drink</a></li>
            <li className={styles.navItem}><a href="#">Bottomless Sundaze</a></li>
            <li className={styles.navItem}><a href="#">Reservations</a></li>
            <li className={styles.navItem}><a href="#">Contact</a></li>
             <li className={styles.navItem}>
              <a href="#" className={styles.active}>FAQ</a>
            </li>
            <li className={styles.navItem}><a href="#">Location & Parking</a></li>
           <li className={styles.navItem}><a href="#">Feedback</a></li>
           
          
          </ul>

          <div className={styles.actions}>
            <Image
              src="/Instagram.png"
              alt="Instagram"
              width={20}
              height={20}
              className={styles.instagramIcon}
            />
            <a href="#" className={styles.bookButton}>Book a Table</a>
          </div>
        </div>
      </nav>
    </header>
  );
}
