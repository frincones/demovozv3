// Business Logic Types for Lirvana

export interface UserLocation {
  country: string;
  state_department: string;
  city: string;
  normalized?: {
    country_code: string;
    region: string;
    zone: string;
  };
}

export interface Executive {
  name: string;
  zone: string;
  whatsapp_link: string;
  specialties: string[];
  departments: string[];
}

export interface GeographicZone {
  id: string;
  name: string;
  country: string;
  departments: string[];
  executives: Executive[];
}

export interface Product {
  id: string;
  name: string;
  category: 'solar_panels' | 'inverters' | 'batteries' | 'accessories';
  description: string;
  features: string[];
  specifications: Record<string, any>;
  use_cases: string[];
  comparison_points?: string[];
}

export interface ProductComparison {
  products: Product[];
  differences: Array<{
    feature: string;
    product_values: Record<string, any>;
    recommendation?: string;
  }>;
  recommendation: {
    suggested_product: string;
    reason: string;
    use_case: string;
  };
}

export interface ConsultationRequest {
  type: 'technical' | 'commercial' | 'project_management' | 'ai_solutions';
  user_location: UserLocation;
  contact_info: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  description: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface BusinessRule {
  id: string;
  name: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'in' | 'matches';
    value: any;
  }>;
  actions: Array<{
    type: 'redirect' | 'assign' | 'escalate' | 'inform';
    target: string;
    data: Record<string, any>;
  }>;
}

export interface ConversationContext {
  user_location?: UserLocation;
  assigned_zone?: string;
  assigned_executive?: Executive;
  products_discussed: string[];
  intent: 'purchase' | 'support' | 'information' | 'consultation' | 'unknown';
  stage: 'greeting' | 'location_gathering' | 'needs_assessment' | 'product_discussion' | 'redirection' | 'completion';
  metadata: Record<string, any>;
}

export interface WhatsAppRedirection {
  executive: Executive;
  message: string;
  link: string;
  context: ConversationContext;
  timestamp: Date;
}

// Company Information Types
export interface CompanyInfo {
  name: string;
  url: string;
  description: string;
  locations: Array<{
    country: string;
    city: string;
    type: 'headquarters' | 'office' | 'manufacturing' | 'distribution';
  }>;
  services: string[];
  products: Product[];
  events: Array<{
    name: string;
    date: string;
    location: string;
    stand?: string;
    description: string;
  }>;
}

// Conversation Flow Types
export type ConversationIntent =
  | 'greeting'
  | 'product_inquiry'
  | 'purchase_intent'
  | 'technical_support'
  | 'commercial_consultation'
  | 'company_information'
  | 'event_information'
  | 'location_request'
  | 'goodbye';

export interface IntentClassification {
  intent: ConversationIntent;
  confidence: number;
  entities: Record<string, any>;
  requires_location: boolean;
  next_action: string;
}