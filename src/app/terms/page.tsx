import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - OpenRelief',
  description: 'Terms of Service for OpenRelief emergency coordination platform'
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using OpenRelief (&quot;the Platform&quot;), you agree to be bound by
            these Terms of Service. OpenRelief is a free, open-source emergency coordination
            platform designed to help communities respond to emergencies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Purpose and Disclaimer</h2>
          <p>
            OpenRelief is a community-driven tool intended to supplement &mdash; not replace &mdash;
            official emergency services. Always call your local emergency number (e.g., 911, 112,
            999) for life-threatening situations. The Platform is provided &quot;as is&quot; without
            warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. User Accounts</h2>
          <p>
            You may sign in using Google OAuth. You are responsible for maintaining the security of
            your account. You must provide accurate information and may not impersonate others or
            create multiple accounts to manipulate trust scores.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. User Conduct</h2>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Submit false or misleading emergency reports</li>
            <li>Use the Platform for non-emergency purposes that could divert resources</li>
            <li>Attempt to manipulate trust scores, ratings, or verification systems</li>
            <li>Share content that is harmful, threatening, or illegal</li>
            <li>Attempt to compromise the security or integrity of the Platform</li>
            <li>Collect user information without consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Emergency Reports</h2>
          <p>
            All emergency reports are community-submitted and community-verified through our
            trust-based system. Reports are not verified by professional emergency responders unless
            explicitly stated. The accuracy of reports depends on the community.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Privacy</h2>
          <p>
            Your use of the Platform is also governed by our{' '}
            <a href="/privacy" className="text-red-600 hover:underline">
              Privacy Policy
            </a>
            . We collect minimal data necessary to provide emergency coordination services. Location
            data is shared only with your consent and only for emergency purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Intellectual Property</h2>
          <p>
            OpenRelief is open-source software licensed under the MIT License. You may use, modify,
            and distribute the software in accordance with the license. User-submitted content
            remains the property of the respective users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p>
            OpenRelief and its contributors shall not be liable for any damages arising from the use
            or inability to use the Platform, including but not limited to direct, indirect,
            incidental, or consequential damages. This includes damages resulting from inaccurate
            emergency reports, service interruptions, or data loss.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. Termination</h2>
          <p>
            We may suspend or terminate your access to the Platform at any time for violations of
            these Terms. You may delete your account at any time through your profile settings or by
            contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">10. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Platform after changes
            constitutes acceptance of the updated Terms. Material changes will be communicated
            through the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">11. Contact</h2>
          <p>
            For questions about these Terms, please open an issue on our{' '}
            <a
              href="https://github.com/openrelief/openrelief"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
