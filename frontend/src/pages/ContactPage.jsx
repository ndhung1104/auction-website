export default function ContactPage() {
  return (
    <div className="row justify-content-center">
      <div className="col-lg-10">
        <h1 className="mb-3">Contact Us</h1>
        <p className="text-secondary">
          Need help with a listing, bidding, or your account? Our support team is ready to assist
          collectors, sellers, and bidders.
        </p>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Support channels</h5>
            <ul className="list-unstyled mb-0">
              <li className="mb-2"><strong>Email:</strong> info@hcmus.edu.vn</li>
              <li className="mb-2"><strong>Phone:</strong> +84 28 6288 4499 (Mon-Fri, 9:00-18:00)</li>
              <li><strong>Address:</strong> 227 Nguyen Van Cu, Ward 4, District 5, Ho Chi Minh City</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Before you contact us</h5>
            <p className="text-secondary mb-2">
              Please include your auction ID, product name, and any screenshots so we can resolve
              your request faster.
            </p>
            <p className="text-secondary mb-0">
              For urgent disputes, mark your email subject with Urgent - Auction Dispute.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
