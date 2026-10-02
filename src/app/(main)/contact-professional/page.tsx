import ContactProfessionalPage from "@/features/contact-professional/ContactProfessionalPage"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Professional - NIVO App',
}

export default function ContactProfessionalPageRoute() {
  return <ContactProfessionalPage />
}
