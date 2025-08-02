import React from 'react';
import { 
  User, 
  Bell, 
  CreditCard, 
  Key, 
  Shield,
  Globe,
  Palette,
  HelpCircle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const settingsSections = [
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Profile Information', value: 'Update your personal details' },
        { label: 'Email Address', value: 'john.doe@example.com' },
        { label: 'Password', value: 'Change your password' }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Workflow Failures', value: 'Email notifications enabled' },
        { label: 'Weekly Reports', value: 'Disabled' },
        { label: 'Security Alerts', value: 'Email + SMS enabled' }
      ]
    },
    {
      title: 'Billing',
      icon: CreditCard,
      items: [
        { label: 'Current Plan', value: 'Professional - $29/month' },
        { label: 'Usage This Month', value: '1,247 / 10,000 runs' },
        { label: 'Next Billing Date', value: 'January 15, 2025' }
      ]
    },
    {
      title: 'API Keys',
      icon: Key,
      items: [
        { label: 'Personal Access Token', value: 'sk-...xYz9 (Active)' },
        { label: 'Webhook Secret', value: 'wh-...aB3c (Active)' },
        { label: 'Rate Limits', value: '1000 requests/hour' }
      ]
    },
    {
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Authentication', value: 'Enabled' },
        { label: 'Login Sessions', value: '3 active sessions' },
        { label: 'Data Encryption', value: 'AES-256 enabled' }
      ]
    },
    {
      title: 'Preferences',
      icon: Palette,
      items: [
        { label: 'Theme', value: 'Light mode' },
        { label: 'Language', value: 'English (US)' },
        { label: 'Timezone', value: 'America/New_York' }
      ]
    }
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => {
            const Icon = section.icon;
            return (
              <div key={sectionIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.value}</p>
                        </div>
                        <button 
                          onClick={() => alert(`Edit functionality for "${item.label}" is not yet implemented. This feature will be available in a future update.`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Help Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Need Help?</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Check out our documentation, join our community, or contact support for assistance.
            </p>
            <div className="flex space-x-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                View Documentation
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};