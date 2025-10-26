import styles from "../styles/feedback.module.css";

export default function FeedbackSection() {
  return (
    <section className={styles.section}>
      <div className={styles.hero}>
        <h1 className={styles.title}>FAQ</h1>
      </div>

      <div className={styles.beigeArea}>
        <p className={styles.intro}>
          <strong>
            <em>Contact us now:</em>
          </strong>{" "}
      chatbot
        </p>

      </div>
    </section>
  );
}
