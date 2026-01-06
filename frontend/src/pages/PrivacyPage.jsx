export default function PrivacyPage() {
  return (
    <div className="row justify-content-center">
      <div className="col-lg-10">
        <h1 className="mb-3">Privacy Policy</h1>
        <p className="text-secondary">
          We respect your privacy and are committed to protecting your personal data.
        </p>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Information we collect</h5>
            <ul className="mb-0">
              <li>Account details such as name, email, and contact information.</li>
              <li>Transaction and bidding activity to support marketplace operations.</li>
              <li>Technical data like device type and session metadata for security.</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">How we use data</h5>
            <ul className="mb-0">
              <li>To operate auctions, verify identities, and prevent fraud.</li>
              <li>To communicate updates about your bids and orders.</li>
              <li>To improve product features and user experience.</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Your choices</h5>
            <p className="text-secondary mb-0">
              You can request data access or deletion by contacting support. We will respond in a
              timely manner in accordance with applicable regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
