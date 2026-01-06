export default function HelpCenterPage() {
  return (
    <div className="row justify-content-center">
      <div className="col-lg-10">
        <h1 className="mb-3">Help Center</h1>
        <p className="text-secondary">
          Find quick answers about bidding, selling, payments, and account safety.
        </p>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Popular topics</h5>
            <ul className="mb-0">
              <li>How automatic bidding works</li>
              <li>Understanding bid increments and minimum bids</li>
              <li>Managing your watchlist and bidding history</li>
              <li>Posting items with high-quality images</li>
              <li>Resolving disputes after an auction ends</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Safety tips</h5>
            <p className="text-secondary mb-2">
              Always review seller ratings, verify item details, and avoid sharing your login
              credentials.
            </p>
            <p className="text-secondary mb-0">
              If you suspect fraudulent activity, contact our support team immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
