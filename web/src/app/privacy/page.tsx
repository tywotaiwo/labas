import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="wordmark">
        <strong>LABAS.</strong>
        <span>PRIVATE</span>
      </div>
      <h1>Privacy notice</h1>
      <p>
        This notice describes the private wellbeing journal used by clients of LABAS Institute during a 90-day coaching
        program. Replace the contact address before any real client uses it. This page is an operational draft for the
        product, not a finished legal opinion.
      </p>
      <h2>Who is responsible</h2>
      <p>
        LABAS Institute decides why these notes are kept and is the controller. The app developer stores them in
        Supabase on the institute’s instructions. Contact: privacy@labas.institute.
      </p>
      <h2>What is collected</h2>
      <p>
        Your name, email address, program dates, an optional daily reminder time, and six self-ratings each day: stress,
        fatigue, physical tension, difficulty focusing, irritability, and sleep disturbance. Each rating is a number from
        0 (none) to 4 (severe). You may skip a day. If you ask for deletion, that request is stored until it is
        completed.
      </p>
      <h2>Why</h2>
      <p>
        The journal gives you and your coach a shared picture of the ninety days. It does not diagnose, treat, or
        monitor emergencies. The ratings are health-related. Before real clients are enrolled, the institute needs a
        valid GDPR legal basis and a condition that permits health-data processing, confirmed with counsel. Consent in
        the app is the acknowledgement a client sees. It is not automatically enough on its own in every context.
      </p>
      <h2>Who can see it</h2>
      <p>
        You can see your own history. Coaches signed into the private admin can see the clients they are responsible
        for. Employers are not given accounts and must not receive individual symptom reports. Data is not sold, and the
        product does not use it to generate advice.
      </p>
      <h2>How long it is kept</h2>
      <p>
        The working retention is the length of the program plus 12 months, so a coaching review is still possible,
        unless you ask for deletion sooner. Confirm this period with counsel before launch and write the final period
        here.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Skip a day without it counting as a missed day.</li>
        <li>Correct a past day inside the program.</li>
        <li>Download a copy of your check-ins from the account button.</li>
        <li>Ask your coach to delete your account and your ratings.</li>
      </ul>
      <p>
        You may also complain to your data protection authority. If you are in Lithuania, that is the State Data
        Protection Inspectorate.
      </p>
      <p>
        <Link href="/">Back</Link>
      </p>
    </main>
  );
}
