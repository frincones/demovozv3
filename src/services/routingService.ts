import type {
  UserLocation,
  Executive,
  WhatsAppRedirection,
  ConversationContext,
  ConversationIntent
} from '@/types/business';
import GeolocationService from './geolocationService';

interface RoutingRule {
  id: string;
  priority: number;
  conditions: {
    intent?: ConversationIntent[];
    country?: string[];
    department?: string[];
    specialty?: string[];
  };
  action: {
    type: 'redirect_executive' | 'redirect_support' | 'collect_info' | 'provide_info';
    target?: string;
    data?: Record<string, any>;
  };
}

class RoutingService {
  private geolocationService: GeolocationService;
  private routingRules: RoutingRule[] = [];

  constructor() {
    this.geolocationService = new GeolocationService();
    this.initializeRoutingRules();
  }

  // Initialize routing rules
  private initializeRoutingRules(): void {
    this.routingRules = [
      // Support requests
      {
        id: 'technical_support',
        priority: 10,
        conditions: {
          intent: ['technical_support']
        },
        action: {
          type: 'redirect_support',
          target: 'victor_support'
        }
      },

      // Commercial requests with location
      {
        id: 'commercial_with_location',
        priority: 8,
        conditions: {
          intent: ['purchase_intent', 'commercial_consultation'],
          country: ['colombia', 'mexico']
        },
        action: {
          type: 'redirect_executive'
        }
      },

      // Product inquiries
      {
        id: 'product_inquiry',
        priority: 6,
        conditions: {
          intent: ['product_inquiry']
        },
        action: {
          type: 'provide_info',
          data: { type: 'product_comparison' }
        }
      },

      // Location collection
      {
        id: 'collect_location',
        priority: 5,
        conditions: {
          intent: ['purchase_intent', 'commercial_consultation']
        },
        action: {
          type: 'collect_info',
          data: { required: ['location'] }
        }
      },

      // Default greeting
      {
        id: 'greeting',
        priority: 1,
        conditions: {
          intent: ['greeting']
        },
        action: {
          type: 'collect_info',
          data: { required: ['location'], greeting: true }
        }
      }
    ];

    // Sort by priority (higher priority first)
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  // Process user input and determine routing
  processInput(
    userInput: string,
    context: ConversationContext
  ): {
    action: 'redirect' | 'collect_info' | 'provide_info' | 'continue';
    data?: any;
    message?: string;
  } {
    // Classify intent
    const intent = this.classifyIntent(userInput, context);

    // Find matching rule
    const rule = this.findMatchingRule(intent, context);

    if (!rule) {
      return {
        action: 'continue',
        message: 'No pude entender completamente tu solicitud. ¿Podrías ser más específico?'
      };
    }

    // Execute rule action
    return this.executeRule(rule, context, intent);
  }

  // Classify user intent
  private classifyIntent(userInput: string, context: ConversationContext): ConversationIntent {
    const input = userInput.toLowerCase();

    // Purchase intent keywords
    if (input.includes('comprar') || input.includes('precio') || input.includes('cotizar') ||
        input.includes('vender') || input.includes('adquirir') || input.includes('orden')) {
      return 'purchase_intent';
    }

    // Technical support keywords
    if (input.includes('soporte') || input.includes('problema') || input.includes('falla') ||
        input.includes('error') || input.includes('ayuda técnica') || input.includes('reparar')) {
      return 'technical_support';
    }

    // Product inquiry keywords
    if (input.includes('polux') || input.includes('diferencia') || input.includes('características') ||
        input.includes('especificaciones') || input.includes('producto') || input.includes('panel')) {
      return 'product_inquiry';
    }

    // Commercial consultation keywords
    if (input.includes('consultoría') || input.includes('proyecto') || input.includes('asesoría') ||
        input.includes('consulta comercial') || input.includes('propuesta')) {
      return 'commercial_consultation';
    }

    // Company information keywords
    if (input.includes('empresa') || input.includes('lirvan') || input.includes('quiénes son') ||
        input.includes('información') || input.includes('acerca de')) {
      return 'company_information';
    }

    // Event information keywords
    if (input.includes('exposolar') || input.includes('stand') || input.includes('evento') ||
        input.includes('feria') || input.includes('exposición')) {
      return 'event_information';
    }

    // Greeting keywords
    if (input.includes('hola') || input.includes('buenos') || input.includes('saludos') ||
        input.includes('buenas') || context.stage === 'greeting') {
      return 'greeting';
    }

    // Location keywords
    if (input.includes('estoy en') || input.includes('vivo en') || input.includes('soy de') ||
        input.includes('ubicado en') || this.extractLocationFromText(input)) {
      return 'location_request';
    }

    return 'greeting'; // Default
  }

  // Extract location information from text
  private extractLocationFromText(text: string): Partial<UserLocation> | null {
    const input = text.toLowerCase();

    // Common patterns for location
    const patterns = [
      /(?:estoy en|vivo en|soy de|ubicado en)\s+(.+)/,
      /(.+),\s*colombia/,
      /(.+),\s*méxico/,
      /bogotá|bogota/,
      /medellín|medellin/,
      /cali|barranquilla|cartagena/,
      /ciudad de méxico|mexico city/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const location = match[1]?.trim();
        if (location) {
          // Try to parse location
          const parts = location.split(',').map(p => p.trim());

          if (parts.length >= 2) {
            return {
              city: parts[0],
              state_department: parts[1],
              country: parts[2] || (input.includes('colombia') ? 'colombia' : 'mexico')
            };
          } else {
            return {
              city: parts[0],
              country: input.includes('colombia') ? 'colombia' : input.includes('méxico') ? 'mexico' : undefined
            };
          }
        }
      }
    }

    return null;
  }

  // Find matching routing rule
  private findMatchingRule(intent: ConversationIntent, context: ConversationContext): RoutingRule | null {
    for (const rule of this.routingRules) {
      if (this.ruleMatches(rule, intent, context)) {
        return rule;
      }
    }
    return null;
  }

  // Check if rule matches current context
  private ruleMatches(rule: RoutingRule, intent: ConversationIntent, context: ConversationContext): boolean {
    const conditions = rule.conditions;

    // Check intent
    if (conditions.intent && !conditions.intent.includes(intent)) {
      return false;
    }

    // Check country
    if (conditions.country && context.user_location) {
      if (!conditions.country.includes(context.user_location.country)) {
        return false;
      }
    }

    // Check department
    if (conditions.department && context.user_location) {
      if (!conditions.department.includes(context.user_location.state_department)) {
        return false;
      }
    }

    return true;
  }

  // Execute routing rule
  private executeRule(
    rule: RoutingRule,
    context: ConversationContext,
    intent: ConversationIntent
  ): {
    action: 'redirect' | 'collect_info' | 'provide_info' | 'continue';
    data?: any;
    message?: string;
  } {
    switch (rule.action.type) {
      case 'redirect_executive':
        return this.handleExecutiveRedirect(context, intent);

      case 'redirect_support':
        return this.handleSupportRedirect();

      case 'collect_info':
        return this.handleInfoCollection(rule.action.data, context);

      case 'provide_info':
        return this.handleInfoProvision(rule.action.data, context);

      default:
        return { action: 'continue' };
    }
  }

  // Handle executive redirection
  private handleExecutiveRedirect(
    context: ConversationContext,
    intent: ConversationIntent
  ): {
    action: 'redirect';
    data: WhatsAppRedirection;
  } {
    if (!context.user_location) {
      throw new Error('Location required for executive redirect');
    }

    // Determine specialty based on intent and conversation context
    let specialty = 'ventas_generales';

    if (context.products_discussed.includes('industrial') ||
        context.metadata?.product_type === 'industrial') {
      specialty = 'alumbrado_publico_industrial';
    } else if (context.products_discussed.includes('alumbrado')) {
      specialty = 'alumbrado_publico_solar';
    }

    // Get appropriate executive
    const executive = this.geolocationService.getExecutiveBySpecialty(context.user_location, specialty);

    if (!executive) {
      throw new Error('No executive found for location');
    }

    // Generate contextualized message
    const message = this.generateWhatsAppMessage(context, executive);

    const redirection: WhatsAppRedirection = {
      executive,
      message,
      link: executive.whatsapp_link,
      context,
      timestamp: new Date()
    };

    return {
      action: 'redirect',
      data: redirection
    };
  }

  // Handle support redirection
  private handleSupportRedirect(): {
    action: 'redirect';
    data: any;
  } {
    const support = this.geolocationService.getSupportContact();

    return {
      action: 'redirect',
      data: {
        type: 'support',
        contact: support,
        message: 'Te voy a conectar con Víctor, nuestro especialista en soporte técnico. Él podrá ayudarte con cualquier problema técnico que tengas.',
        link: support.whatsapp_link
      }
    };
  }

  // Handle information collection
  private handleInfoCollection(
    data: any,
    context: ConversationContext
  ): {
    action: 'collect_info';
    data: any;
    message: string;
  } {
    const required = data?.required || [];

    if (required.includes('location') && !context.user_location) {
      const message = data?.greeting
        ? '¡Hola! Soy Lirvana. Para ayudarte de la mejor manera, ¿podrías decirme en qué país, ciudad y departamento te encuentras?'
        : 'Para poder asignarte al ejecutivo comercial correcto, necesito saber tu ubicación. ¿En qué país, ciudad y departamento estás?';

      return {
        action: 'collect_info',
        data: { type: 'location', required: ['country', 'state_department', 'city'] },
        message
      };
    }

    return {
      action: 'collect_info',
      data,
      message: '¿Podrías proporcionarme más información?'
    };
  }

  // Handle information provision
  private handleInfoProvision(
    data: any,
    context: ConversationContext
  ): {
    action: 'provide_info';
    data: any;
    message?: string;
  } {
    return {
      action: 'provide_info',
      data
    };
  }

  // Generate contextualized WhatsApp message
  private generateWhatsAppMessage(context: ConversationContext, executive: Executive): string {
    const location = context.user_location!;
    const locationStr = `${location.city}, ${location.state_department}, ${location.country}`;

    let message = `Hola ${executive.name}, soy Lirvana. `;
    message += `Te estoy transfiriendo un cliente desde ${locationStr} `;

    // Add context based on conversation
    if (context.intent === 'purchase_intent') {
      message += 'que está interesado en realizar una compra. ';
    } else if (context.intent === 'commercial_consultation') {
      message += 'que necesita consultoría comercial. ';
    }

    // Add product context
    if (context.products_discussed.length > 0) {
      message += `Ha mostrado interés en: ${context.products_discussed.join(', ')}. `;
    }

    message += 'Por favor, bríndale la mejor atención. ¡Gracias!';

    return message;
  }

  // Get zone by location
  getZone(location: UserLocation): string {
    const zone = this.geolocationService.getZone(location);
    return zone?.id || 'unknown';
  }

  // Get executives by zone and product type
  getExecutiveByZoneAndProduct(zone: string, productType: string): Executive {
    // This is a simplified version - in practice, you'd have more complex logic
    const allZones = this.geolocationService.getAllZones();
    const targetZone = allZones.find(z => z.id === zone);

    if (!targetZone) {
      throw new Error(`Zone ${zone} not found`);
    }

    // Find executive by product type
    let executive = targetZone.executives.find(exec => {
      if (productType.includes('industrial')) {
        return exec.specialties.includes('alumbrado_publico_industrial');
      } else if (productType.includes('alumbrado')) {
        return exec.specialties.includes('alumbrado_publico_solar');
      } else {
        return exec.specialties.includes('ventas_generales') ||
               exec.specialties.includes('todas_las_lineas');
      }
    });

    // Fallback to first available executive
    if (!executive) {
      executive = targetZone.executives[0];
    }

    if (!executive) {
      throw new Error(`No executives found for zone ${zone}`);
    }

    return executive;
  }

  // Validate and process location input
  processLocationInput(input: string): {
    success: boolean;
    location?: UserLocation;
    message?: string;
  } {
    const extracted = this.extractLocationFromText(input);

    if (!extracted) {
      return {
        success: false,
        message: 'No pude extraer la ubicación de tu mensaje. ¿Podrías decirme específicamente en qué país, ciudad y departamento estás?'
      };
    }

    // Validate completeness
    const validation = this.geolocationService.validateLocation(extracted);

    if (!validation.isValid) {
      return {
        success: false,
        message: `Me falta información sobre: ${validation.missing.join(', ')}. ${validation.suggestions?.join(' ') || ''}`
      };
    }

    // Normalize location
    const normalized = this.geolocationService.normalize(extracted as UserLocation);

    // Verify we can assign an executive
    const executives = this.geolocationService.getExecutives(normalized);

    if (executives.length === 0) {
      return {
        success: false,
        message: 'Lo siento, actualmente no tenemos cobertura en esa ubicación. ¿Podrías verificar tu ubicación?'
      };
    }

    return {
      success: true,
      location: normalized
    };
  }

  // Get available coverage areas
  getCoverageAreas(): Array<{ country: string; departments: string[] }> {
    const zones = this.geolocationService.getAllZones();
    const coverage: Array<{ country: string; departments: string[] }> = [];

    for (const zone of zones) {
      const existing = coverage.find(c => c.country === zone.country);
      if (existing) {
        existing.departments.push(...zone.departments);
      } else {
        coverage.push({
          country: zone.country,
          departments: [...zone.departments]
        });
      }
    }

    // Remove duplicates
    coverage.forEach(c => {
      c.departments = [...new Set(c.departments)];
    });

    return coverage;
  }
}

export default RoutingService;