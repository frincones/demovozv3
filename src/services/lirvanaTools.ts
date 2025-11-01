import type { RealtimeTool } from '@/types/realtime';
import type {
  UserLocation,
  Executive,
  Product,
  ProductComparison,
  ConsultationRequest,
  WhatsAppRedirection,
  ConversationContext
} from '@/types/business';

import GeolocationService from './geolocationService';
import RoutingService from './routingService';

export class LirvanaTools {
  private geolocationService: GeolocationService;
  private routingService: RoutingService;
  private products: Product[];

  constructor() {
    this.geolocationService = new GeolocationService();
    this.routingService = new RoutingService();
    this.initializeProducts();
  }

  // Initialize product catalog
  private initializeProducts(): void {
    this.products = [
      {
        id: 'polux40',
        name: 'Polux40',
        category: 'solar_panels',
        description: 'Panel solar de uso estándar ideal para aplicaciones residenciales y comerciales básicas',
        features: [
          'Potencia estándar optimizada',
          'Fácil instalación',
          'Garantía extendida',
          'Eficiencia probada',
          'Costo-beneficio excelente'
        ],
        specifications: {
          power: '40W',
          efficiency: '18-20%',
          warranty: '25 años',
          applications: ['residencial', 'comercial_basico'],
          mounting: 'estándar'
        },
        use_cases: [
          'Hogares unifamiliares',
          'Pequeños comercios',
          'Aplicaciones rurales',
          'Sistemas básicos de respaldo'
        ],
        comparison_points: [
          'Precio más accesible',
          'Instalación simplificada',
          'Mantenimiento básico',
          'Ideal para iniciarse en energía solar'
        ]
      },
      {
        id: 'polux40_pro',
        name: 'Polux40 Pro',
        category: 'solar_panels',
        description: 'Panel solar avanzado para necesidades industriales y comerciales complejas',
        features: [
          'Tecnología avanzada de células',
          'Mayor eficiencia energética',
          'Resistencia industrial',
          'Monitoreo inteligente',
          'Optimización automática'
        ],
        specifications: {
          power: '40W+',
          efficiency: '22-25%',
          warranty: '30 años',
          applications: ['industrial', 'comercial_avanzado', 'grandes_proyectos'],
          mounting: 'industrial'
        },
        use_cases: [
          'Industrias y fábricas',
          'Centros comerciales',
          'Proyectos gubernamentales',
          'Sistemas de gran escala',
          'Alumbrado público industrial'
        ],
        comparison_points: [
          'Mayor eficiencia energética',
          'Tecnología más avanzada',
          'Resistencia superior',
          'Monitoreo y control inteligente',
          'ROI optimizado para grandes proyectos'
        ]
      }
    ];
  }

  // Get all available tools
  getTools(): RealtimeTool[] {
    return [
      this.getLocationTool(),
      this.getRedirectSalesTool(),
      this.getProductComparisonTool(),
      this.getScheduleConsultationTool(),
      this.getExposolarInfoTool(),
      this.getCompanyInfoTool(),
      this.getRedirectSupportTool(),
      this.getWebSearchTool(),
      this.getAVSyncChallengeTool() // NEW: Deepfake detection
    ];
  }

  // Location information tool
  private getLocationTool(): RealtimeTool {
    return {
      name: 'get_location_info',
      description: 'Procesa y valida la ubicación del usuario para asignación de ejecutivo comercial',
      parameters: {
        type: 'object',
        properties: {
          country: {
            type: 'string',
            description: 'País del usuario (ej: Colombia, México)'
          },
          state_department: {
            type: 'string',
            description: 'Departamento o estado del usuario'
          },
          city: {
            type: 'string',
            description: 'Ciudad del usuario'
          }
        },
        required: ['country']
      }
    };
  }

  // Sales redirection tool
  private getRedirectSalesTool(): RealtimeTool {
    return {
      name: 'redirect_to_sales',
      description: 'Redirige al usuario al ejecutivo comercial apropiado según su ubicación y tipo de producto',
      parameters: {
        type: 'object',
        properties: {
          user_location: {
            type: 'object',
            description: 'Ubicación normalizada del usuario'
          },
          product_type: {
            type: 'string',
            enum: ['general', 'alumbrado_publico_solar', 'alumbrado_publico_industrial'],
            description: 'Tipo de producto de interés'
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Nivel de urgencia de la consulta'
          }
        },
        required: ['user_location']
      }
    };
  }

  // Product comparison tool
  private getProductComparisonTool(): RealtimeTool {
    return {
      name: 'product_comparison',
      description: 'Compara productos Polux40 y Polux40 Pro según las necesidades del usuario',
      parameters: {
        type: 'object',
        properties: {
          use_case: {
            type: 'string',
            description: 'Caso de uso del usuario (residencial, comercial, industrial)'
          },
          budget_range: {
            type: 'string',
            enum: ['economico', 'medio', 'premium'],
            description: 'Rango de presupuesto aproximado'
          },
          scale: {
            type: 'string',
            enum: ['pequeño', 'mediano', 'grande'],
            description: 'Escala del proyecto'
          },
          requirements: {
            type: 'array',
            items: { type: 'string' },
            description: 'Requerimientos específicos del usuario'
          }
        },
        required: ['use_case']
      }
    };
  }

  // Schedule consultation tool
  private getScheduleConsultationTool(): RealtimeTool {
    return {
      name: 'schedule_consultation',
      description: 'Facilita el agendamiento de consultoría técnica o comercial',
      parameters: {
        type: 'object',
        properties: {
          consultation_type: {
            type: 'string',
            enum: ['technical', 'commercial', 'project_management', 'ai_solutions'],
            description: 'Tipo de consultoría requerida'
          },
          user_contact: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              phone: { type: 'string' },
              email: { type: 'string' },
              company: { type: 'string' }
            }
          },
          description: {
            type: 'string',
            description: 'Descripción del proyecto o necesidad'
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Nivel de urgencia'
          }
        },
        required: ['consultation_type']
      }
    };
  }

  // Exposolar event information tool
  private getExposolarInfoTool(): RealtimeTool {
    return {
      name: 'exposolar_info',
      description: 'Proporciona información sobre la participación de Lirvan en Exposolar 2025',
      parameters: {
        type: 'object',
        properties: {
          info_type: {
            type: 'string',
            enum: ['general', 'location', 'activities', 'contact'],
            description: 'Tipo de información solicitada sobre Exposolar'
          }
        }
      }
    };
  }

  // Company information tool
  private getCompanyInfoTool(): RealtimeTool {
    return {
      name: 'company_info',
      description: 'Proporciona información general sobre Lirvan como empresa',
      parameters: {
        type: 'object',
        properties: {
          info_type: {
            type: 'string',
            enum: ['general', 'services', 'locations', 'history', 'certifications'],
            description: 'Tipo de información sobre la empresa'
          }
        }
      }
    };
  }

  // Support redirection tool
  private getRedirectSupportTool(): RealtimeTool {
    return {
      name: 'redirect_to_support',
      description: 'Redirige al usuario a soporte técnico para problemas técnicos',
      parameters: {
        type: 'object',
        properties: {
          issue_type: {
            type: 'string',
            enum: ['installation', 'maintenance', 'troubleshooting', 'warranty'],
            description: 'Tipo de problema técnico'
          },
          description: {
            type: 'string',
            description: 'Descripción del problema'
          }
        },
        required: ['issue_type']
      }
    };
  }

  // Web search tool
  private getWebSearchTool(): RealtimeTool {
    return {
      name: 'web_search',
      description: 'Busca información actualizada en internet cuando no se encuentra en la base de conocimiento',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Términos de búsqueda o pregunta específica'
          },
          context: {
            type: 'string',
            description: 'Contexto de la conversación para mejorar la búsqueda'
          },
          search_type: {
            type: 'string',
            enum: ['general', 'technical', 'product_info', 'news', 'solar_industry'],
            description: 'Tipo de búsqueda para optimizar resultados'
          }
        },
        required: ['query']
      }
    };
  }

  // Tool handlers

  // Handle location processing
  async handleLocationInfo(params: any): Promise<any> {
    try {
      const location: UserLocation = this.geolocationService.normalize({
        country: params.country,
        state_department: params.state_department,
        city: params.city
      });

      const validation = this.geolocationService.validateLocation(location);

      if (!validation.isValid) {
        return {
          success: false,
          message: `Para asignarte al ejecutivo correcto, necesito que me proporciones: ${validation.missing.join(', ')}.`,
          missing_info: validation.missing,
          suggestions: validation.suggestions
        };
      }

      const executives = this.geolocationService.getExecutives(location);

      return {
        success: true,
        location,
        available_executives: executives,
        zone: location.normalized?.zone,
        message: `Perfecto, tienes ubicación en ${location.normalized?.region}. Te voy a conectar con nuestro ejecutivo para tu zona.`
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Hubo un error procesando tu ubicación. ¿Podrías intentar de nuevo?',
        error: error.message
      };
    }
  }

  // Handle sales redirection
  async handleSalesRedirect(params: any): Promise<any> {
    try {
      const { user_location, product_type = 'general' } = params;

      const executive = this.geolocationService.getExecutiveBySpecialty(
        user_location,
        product_type
      );

      if (!executive) {
        return {
          success: false,
          message: 'No pudimos encontrar un ejecutivo para tu zona. ¿Podrías verificar tu ubicación?'
        };
      }

      // Generate contextualized message
      const context: ConversationContext = {
        user_location,
        assigned_executive: executive,
        products_discussed: [product_type],
        intent: 'purchase_intent',
        stage: 'redirection',
        metadata: { product_type }
      };

      const message = this.generateRedirectionMessage(executive, context);

      return {
        success: true,
        executive: {
          name: executive.name,
          zone: executive.zone,
          specialties: executive.specialties
        },
        whatsapp_link: executive.whatsapp_link,
        message,
        redirect_type: 'sales'
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Hubo un error procesando tu solicitud. ¿Podrías intentar de nuevo?',
        error: error.message
      };
    }
  }

  // Handle product comparison
  async handleProductComparison(params: any): Promise<any> {
    const { use_case, budget_range, scale, requirements = [] } = params;

    const polux40 = this.products.find(p => p.id === 'polux40')!;
    const polux40Pro = this.products.find(p => p.id === 'polux40_pro')!;

    // Analyze needs and provide recommendation
    let recommendedProduct = polux40;
    let reason = '';

    if (use_case === 'industrial' || scale === 'grande') {
      recommendedProduct = polux40Pro;
      reason = 'Para proyectos industriales o de gran escala, Polux40 Pro ofrece mayor eficiencia y características avanzadas';
    } else if (budget_range === 'economico' || scale === 'pequeño') {
      recommendedProduct = polux40;
      reason = 'Para proyectos residenciales o comerciales básicos, Polux40 ofrece excelente relación costo-beneficio';
    } else if (requirements.some(req => req.includes('monitoreo') || req.includes('inteligente'))) {
      recommendedProduct = polux40Pro;
      reason = 'Polux40 Pro incluye monitoreo inteligente y funciones avanzadas que necesitas';
    }

    const comparison: ProductComparison = {
      products: [polux40, polux40Pro],
      differences: [
        {
          feature: 'Eficiencia',
          product_values: {
            'polux40': '18-20%',
            'polux40_pro': '22-25%'
          },
          recommendation: 'Polux40 Pro tiene mayor eficiencia energética'
        },
        {
          feature: 'Aplicaciones',
          product_values: {
            'polux40': 'Residencial y comercial básico',
            'polux40_pro': 'Industrial y comercial avanzado'
          }
        },
        {
          feature: 'Garantía',
          product_values: {
            'polux40': '25 años',
            'polux40_pro': '30 años'
          }
        },
        {
          feature: 'Tecnología',
          product_values: {
            'polux40': 'Estándar optimizada',
            'polux40_pro': 'Avanzada con monitoreo inteligente'
          }
        }
      ],
      recommendation: {
        suggested_product: recommendedProduct.id,
        reason,
        use_case
      }
    };

    return {
      success: true,
      comparison,
      message: `Basado en tu caso de uso (${use_case}), te recomiendo ${recommendedProduct.name}. ${reason}.`
    };
  }

  // Handle consultation scheduling
  async handleScheduleConsultation(params: any): Promise<any> {
    const { consultation_type, user_contact, description, urgency = 'medium' } = params;

    const consultationTypes = {
      technical: 'consultoría técnica',
      commercial: 'consultoría comercial',
      project_management: 'gestión de proyectos',
      ai_solutions: 'soluciones de IA'
    };

    return {
      success: true,
      consultation_type: consultationTypes[consultation_type as keyof typeof consultationTypes],
      message: `Para agendar tu ${consultationTypes[consultation_type as keyof typeof consultationTypes]}, te voy a conectar con nuestro especialista. Ellos coordinaran directamente contigo los detalles y disponibilidad.`,
      next_step: 'redirect_to_specialist',
      urgency,
      requires_contact: !user_contact
    };
  }

  // Handle Exposolar information
  async handleExposolarInfo(params: any): Promise<any> {
    const { info_type = 'general' } = params;

    const exposolarInfo = {
      general: {
        event: 'Exposolar 2025',
        participation: 'Lirvan estará presente en Exposolar 2025',
        stand: '256',
        invitation: 'Estás cordialmente invitado a visitarnos'
      },
      location: {
        stand_number: '256',
        message: 'Nos encontrarás en el stand 256. ¡Te esperamos!'
      },
      activities: {
        message: 'En nuestro stand podrás conocer toda la gama de productos Polux, recibir asesoría personalizada y ser parte de la revolución energética solar del continente'
      },
      contact: {
        message: 'Puedes visitarnos directamente en el stand 256 o contactarnos previamente para coordinar una reunión'
      }
    };

    const info = exposolarInfo[info_type as keyof typeof exposolarInfo] || exposolarInfo.general;

    return {
      success: true,
      event_info: info,
      message: `En Exposolar 2025 estaremos en el stand 256. ${info.message || 'Te esperamos para que seas parte de la revolución energética solar del continente.'}`
    };
  }

  // Handle company information
  async handleCompanyInfo(params: any): Promise<any> {
    const { info_type = 'general' } = params;

    const companyInfo = {
      general: {
        name: 'Lirvan',
        description: 'Empresa colombiana fabricante de equipos solares con presencia en México y Hong Kong',
        focus: 'Soluciones integrales de energía solar'
      },
      services: {
        list: ['Consultoría en energía solar', 'Soluciones de IA', 'Gestión de proyectos', 'Fabricación de equipos'],
        message: 'Ofrecemos servicios integrales desde consultoría hasta implementación completa'
      },
      locations: {
        headquarters: 'Colombia',
        international: ['México', 'Hong Kong'],
        coverage: 'América y Europa'
      },
      certifications: {
        message: 'Contamos con todas las certificaciones internacionales de calidad y sostenibilidad'
      }
    };

    const info = companyInfo[info_type as keyof typeof companyInfo] || companyInfo.general;

    return {
      success: true,
      company_info: info,
      message: `Lirvan es una empresa colombiana fabricante de equipos solares con presencia internacional. ${info.message || 'Nos especializamos en soluciones integrales de energía solar.'}`
    };
  }

  // Handle support redirection
  async handleSupportRedirect(params: any): Promise<any> {
    const { issue_type, description } = params;

    const support = this.geolocationService.getSupportContact();

    const issueTypes = {
      installation: 'instalación',
      maintenance: 'mantenimiento',
      troubleshooting: 'resolución de problemas',
      warranty: 'garantía'
    };

    return {
      success: true,
      support_contact: support,
      issue_type: issueTypes[issue_type as keyof typeof issueTypes],
      message: `Te voy a transferir con ${support.name}, nuestro especialista en soporte técnico. Él te ayudará con tu problema de ${issueTypes[issue_type as keyof typeof issueTypes]}.`,
      whatsapp_link: support.whatsapp_link,
      redirect_type: 'support'
    };
  }

  // Handle web search
  async handleWebSearch(params: any): Promise<any> {
    const { query, context, search_type = 'general' } = params;

    try {
      // Aquí se implementará la búsqueda web real usando las herramientas de OpenAI
      // Por ahora, devolvemos una respuesta simulada indicando que la herramienta está disponible

      const searchContext = context ? ` en el contexto de: ${context}` : '';
      const typeDescription = {
        general: 'información general',
        technical: 'información técnica especializada',
        product_info: 'información de productos',
        news: 'noticias actualizadas',
        solar_industry: 'industria solar'
      }[search_type] || 'información general';

      return {
        success: true,
        query: query,
        search_type: typeDescription,
        message: `He realizado una búsqueda sobre "${query}" para obtener ${typeDescription}${searchContext}. Basándome en la información encontrada, puedo ayudarte con tu consulta. ¿Hay algo específico que te gustaría saber?`,
        suggestion: 'Si no encuentro información suficiente en mi base de conocimiento, puedo buscar datos más actualizados para darte la mejor respuesta posible.',
        next_action: 'provide_information'
      };
    } catch (error) {
      console.error('Error in web search:', error);
      return {
        success: false,
        error: 'Error realizando búsqueda',
        message: 'No pude realizar la búsqueda en este momento. Permíteme ayudarte con la información que tengo disponible en mi base de conocimiento.',
        fallback: true
      };
    }
  }

  // Generate redirection message
  private generateRedirectionMessage(executive: Executive, context: ConversationContext): string {
    const location = context.user_location!;
    let message = `Perfecto, te voy a conectar con ${executive.name}, `;

    if (executive.specialties.includes('todas_las_lineas')) {
      message += `quien maneja todas nuestras líneas de productos en ${location.normalized?.region}. `;
    } else if (executive.specialties.includes('alumbrado_publico_industrial')) {
      message += `nuestro especialista en alumbrado público industrial para ${location.normalized?.region}. `;
    } else if (executive.specialties.includes('alumbrado_publico_solar')) {
      message += `nuestro especialista en alumbrado público solar para ${location.normalized?.region}. `;
    } else {
      message += `nuestro ejecutivo comercial para ${location.normalized?.region}. `;
    }

    message += `${executive.name} te brindará toda la información que necesitas y te ayudará con tu proyecto. `;
    message += `Al hacer clic en el enlace, se abrirá WhatsApp con ${executive.name} directamente.`;

    return message;
  }

  // AV-Sync challenge tool (NEW)
  private getAVSyncChallengeTool(): RealtimeTool {
    return {
      name: 'av_sync_challenge',
      description: 'Inicia un reto de verificación de sincronía audio-visual para detectar deepfakes y validar la identidad del usuario mediante análisis de la sincronización entre movimiento labial y audio',
      parameters: {
        type: 'object',
        properties: {
          challenge_phrase: {
            type: 'string',
            description: 'Frase específica que el usuario debe repetir (opcional, se generará aleatoriamente si no se provee)'
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
            description: 'Dificultad del reto (easy: frase corta, medium: frase normal, hard: trabalenguas)'
          },
          reason: {
            type: 'string',
            description: 'Razón por la cual se solicita la verificación (para contexto del usuario)'
          }
        },
        required: []
      }
    };
  }

  // Handler for AV-Sync challenge (NEW)
  async handleAVSyncChallenge(params: any): Promise<any> {
    try {
      // This handler just signals that the challenge should start
      // The actual UI handling is done in useLirvana hook
      return {
        success: true,
        message: 'Verificación de identidad iniciada. Por favor, sigue las instrucciones en pantalla.',
        challenge_phrase: params.challenge_phrase || null,
        difficulty: params.difficulty || 'easy',
        reason: params.reason || 'Verificación de seguridad estándar'
      };
    } catch (error) {
      console.error('Error in AV-Sync challenge:', error);
      return {
        success: false,
        error: 'Error iniciando verificación',
        message: 'No pude iniciar la verificación de identidad. Por favor, intenta de nuevo.'
      };
    }
  }

  // Get all tool handlers
  getToolHandlers(): Map<string, Function> {
    const handlers = new Map<string, Function>();

    handlers.set('get_location_info', this.handleLocationInfo.bind(this));
    handlers.set('redirect_to_sales', this.handleSalesRedirect.bind(this));
    handlers.set('product_comparison', this.handleProductComparison.bind(this));
    handlers.set('schedule_consultation', this.handleScheduleConsultation.bind(this));
    handlers.set('exposolar_info', this.handleExposolarInfo.bind(this));
    handlers.set('company_info', this.handleCompanyInfo.bind(this));
    handlers.set('redirect_to_support', this.handleSupportRedirect.bind(this));
    handlers.set('web_search', this.handleWebSearch.bind(this));
    handlers.set('av_sync_challenge', this.handleAVSyncChallenge.bind(this)); // NEW

    return handlers;
  }
}

export default LirvanaTools;