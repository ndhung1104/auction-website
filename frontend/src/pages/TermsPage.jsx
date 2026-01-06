export default function TermsPage() {
  return (
    <div className="row justify-content-center">
      <div className="col-lg-10">
        <h1 className="mb-3">Terms of Service</h1>
        <p className="text-secondary">
          By using BidMaster, you agree to the rules that keep auctions fair and trustworthy.
        </p>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Account responsibilities</h5>
            <ul className="mb-0">
              <li>You must provide accurate account details and keep your credentials secure.</li>
              <li>Only confirmed accounts may bid or sell items.</li>
              <li>We may suspend accounts that violate marketplace rules.</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Bidding and selling</h5>
            <ul className="mb-0">
              <li>Bids are binding and cannot be retracted once placed.</li>
              <li>Sellers must provide accurate descriptions and authentic images.</li>
              <li>Bid manipulation, shill bidding, or counterfeit listings are prohibited.</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Disputes</h5>
            <p className="text-secondary mb-0">
              In case of disputes, BidMaster may request evidence from both parties and will
              determine the outcome based on marketplace policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
