import RequestForm from '@/components/RequestForm'

export default function NewRequestPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">New Request</h1>
        <p className="text-gray-500 text-sm mt-1">Submit a content request to Capital Consulting</p>
      </div>
      <RequestForm />
    </div>
  )
}
