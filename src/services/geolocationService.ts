import type {
  UserLocation,
  Executive,
  GeographicZone
} from '@/types/business';

class GeolocationService {
  private zones: GeographicZone[] = [];

  constructor() {
    this.initializeZones();
  }

  // Initialize geographic zones with executives
  private initializeZones(): void {
    this.zones = [
      {
        id: 'zona_andina_sur',
        name: 'Zona Andina Sur',
        country: 'colombia',
        departments: ['bogota', 'boyaca', 'cundinamarca', 'meta'],
        executives: [
          {
            name: 'Mary Luz',
            zone: 'zona_andina_sur',
            whatsapp_link: 'https://wa.link/np07vd',
            specialties: ['todas_las_lineas'],
            departments: ['bogota', 'boyaca', 'cundinamarca', 'meta']
          }
        ]
      },
      {
        id: 'zona_andina_norte',
        name: 'Zona Andina Norte',
        country: 'colombia',
        departments: ['antioquia', 'caldas', 'quindio', 'risaralda', 'valle_del_cauca', 'cauca'],
        executives: [
          {
            name: 'Jhon Alex',
            zone: 'zona_andina_norte',
            whatsapp_link: 'https://wa.link/5sm6ok',
            specialties: ['todas_las_lineas'],
            departments: ['antioquia', 'caldas', 'quindio', 'risaralda', 'valle_del_cauca', 'cauca']
          }
        ]
      },
      {
        id: 'zona_general_colombia',
        name: 'Zona General Colombia',
        country: 'colombia',
        departments: ['cordoba', 'santander', 'norte_de_santander', 'magdalena', 'atlantico', 'other'],
        executives: [
          {
            name: 'Eduardo',
            zone: 'zona_general_colombia',
            whatsapp_link: 'https://wa.link/blu3xx',
            specialties: ['ventas_generales', 'todas_las_lineas'],
            departments: ['cordoba', 'santander', 'norte_de_santander', 'magdalena', 'atlantico', 'other']
          }
        ]
      },
      {
        id: 'mexico',
        name: 'México',
        country: 'mexico',
        departments: ['all'],
        executives: [
          {
            name: 'Kelly',
            zone: 'mexico',
            whatsapp_link: 'https://wa.link/plpr1f',
            specialties: ['ventas_generales'],
            departments: ['all']
          },
          {
            name: 'Ana',
            zone: 'mexico',
            whatsapp_link: 'https://wa.link/2ed7gb',
            specialties: ['ventas_generales'],
            departments: ['all']
          },
          {
            name: 'Michael',
            zone: 'mexico',
            whatsapp_link: 'https://wa.link/o64i45',
            specialties: ['ventas_generales'],
            departments: ['all']
          }
        ]
      }
    ];
  }

  // Normalize location input
  normalize(location: Partial<UserLocation>): UserLocation {
    const normalized: UserLocation = {
      country: this.normalizeCountry(location.country || ''),
      state_department: this.normalizeDepartment(location.state_department || ''),
      city: this.normalizeCity(location.city || ''),
    };

    // Add normalized metadata
    normalized.normalized = {
      country_code: this.getCountryCode(normalized.country),
      region: this.getRegion(normalized.country, normalized.state_department),
      zone: this.getZoneId(normalized.country, normalized.state_department)
    };

    return normalized;
  }

  // Normalize country name
  private normalizeCountry(country: string): string {
    const normalized = country.toLowerCase().trim();

    const countryMappings: Record<string, string> = {
      'colombia': 'colombia',
      'col': 'colombia',
      'co': 'colombia',
      'méxico': 'mexico',
      'mexico': 'mexico',
      'mex': 'mexico',
      'mx': 'mexico',
      'estados unidos mexicanos': 'mexico'
    };

    return countryMappings[normalized] || normalized;
  }

  // Normalize department/state name
  private normalizeDepartment(department: string): string {
    const normalized = department.toLowerCase().trim()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n');

    const departmentMappings: Record<string, string> = {
      // Colombia departments
      'bogota': 'bogota',
      'bogota d.c.': 'bogota',
      'distrito capital': 'bogota',
      'cundinamarca': 'cundinamarca',
      'boyaca': 'boyaca',
      'meta': 'meta',
      'antioquia': 'antioquia',
      'medellin': 'antioquia',
      'caldas': 'caldas',
      'manizales': 'caldas',
      'quindio': 'quindio',
      'armenia': 'quindio',
      'risaralda': 'risaralda',
      'pereira': 'risaralda',
      'valle del cauca': 'valle_del_cauca',
      'valle': 'valle_del_cauca',
      'cali': 'valle_del_cauca',
      'cauca': 'cauca',
      'popayan': 'cauca',
      'cordoba': 'cordoba',
      'monteria': 'cordoba',
      'santander': 'santander',
      'bucaramanga': 'santander',
      'norte de santander': 'norte_de_santander',
      'cucuta': 'norte_de_santander',
      'magdalena': 'magdalena',
      'santa marta': 'magdalena',
      'atlantico': 'atlantico',
      'barranquilla': 'atlantico',
      // Mexico states (examples)
      'ciudad de mexico': 'cdmx',
      'cdmx': 'cdmx',
      'df': 'cdmx',
      'nuevo leon': 'nuevo_leon',
      'monterrey': 'nuevo_leon'
    };

    return departmentMappings[normalized] || normalized;
  }

  // Normalize city name
  private normalizeCity(city: string): string {
    return city.toLowerCase().trim()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n');
  }

  // Get country code
  private getCountryCode(country: string): string {
    const codes: Record<string, string> = {
      'colombia': 'CO',
      'mexico': 'MX'
    };
    return codes[country] || 'UNKNOWN';
  }

  // Get region
  private getRegion(country: string, department: string): string {
    if (country === 'colombia') {
      const andinaSur = ['bogota', 'boyaca', 'cundinamarca', 'meta'];
      const andinaNorte = ['antioquia', 'caldas', 'quindio', 'risaralda', 'valle_del_cauca', 'cauca'];
      const generalColombia = ['cordoba', 'santander', 'norte_de_santander', 'magdalena', 'atlantico'];

      if (andinaSur.includes(department)) return 'Andina Sur';
      if (andinaNorte.includes(department)) return 'Andina Norte';
      if (generalColombia.includes(department)) return 'General Colombia';

      // Para cualquier departamento no especificado de Colombia
      return 'General Colombia';
    }

    if (country === 'mexico') {
      return 'México';
    }

    return 'Unknown';
  }

  // Get zone ID
  private getZoneId(country: string, department: string): string {
    if (country === 'colombia') {
      const andinaSur = ['bogota', 'boyaca', 'cundinamarca', 'meta'];
      const andinaNorte = ['antioquia', 'caldas', 'quindio', 'risaralda', 'valle_del_cauca', 'cauca'];
      const generalColombia = ['cordoba', 'santander', 'norte_de_santander', 'magdalena', 'atlantico'];

      if (andinaSur.includes(department)) return 'zona_andina_sur';
      if (andinaNorte.includes(department)) return 'zona_andina_norte';
      if (generalColombia.includes(department)) return 'zona_general_colombia';

      // Para cualquier departamento no especificado de Colombia, usar zona general
      return 'zona_general_colombia';
    }

    if (country === 'mexico') {
      return 'mexico';
    }

    return 'unknown';
  }

  // Get zone by location
  getZone(location: UserLocation): GeographicZone | null {
    const zoneId = location.normalized?.zone || this.getZoneId(location.country, location.state_department);
    return this.zones.find(zone => zone.id === zoneId) || null;
  }

  // Get executives for location
  getExecutives(location: UserLocation): Executive[] {
    const zone = this.getZone(location);
    return zone?.executives || [];
  }

  // Get executive by specialty
  getExecutiveBySpecialty(location: UserLocation, specialty: string): Executive | null {
    const executives = this.getExecutives(location);

    // First try to find exact specialty match
    let executive = executives.find(exec => exec.specialties.includes(specialty));

    // If no exact match, try general categories
    if (!executive) {
      if (specialty.includes('industrial')) {
        executive = executives.find(exec => exec.specialties.includes('alumbrado_publico_industrial'));
      } else if (specialty.includes('alumbrado')) {
        executive = executives.find(exec => exec.specialties.includes('alumbrado_publico_solar'));
      } else {
        // Default to general sales or first available
        executive = executives.find(exec =>
          exec.specialties.includes('ventas_generales') ||
          exec.specialties.includes('todas_las_lineas')
        ) || executives[0];
      }
    }

    return executive || null;
  }

  // Get support contact (Victor - technical support)
  getSupportContact(): { name: string; whatsapp_link: string; type: 'support' } {
    return {
      name: 'Víctor',
      whatsapp_link: 'https://wa.link/sp94l9',
      type: 'support'
    };
  }

  // Validate location completeness
  validateLocation(location: Partial<UserLocation>): {
    isValid: boolean;
    missing: string[];
    suggestions?: string[];
  } {
    const missing: string[] = [];

    if (!location.country) missing.push('país');
    if (!location.state_department) missing.push('departamento/estado');
    if (!location.city) missing.push('ciudad');

    const isValid = missing.length === 0;

    // Provide suggestions for common issues
    const suggestions: string[] = [];
    if (location.country && !this.normalizeCountry(location.country)) {
      suggestions.push('Verifique que el país sea Colombia o México');
    }

    return {
      isValid,
      missing,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  // Get all available zones
  getAllZones(): GeographicZone[] {
    return [...this.zones];
  }

  // Get all departments for a country
  getDepartmentsByCountry(country: string): string[] {
    const normalizedCountry = this.normalizeCountry(country);
    return this.zones
      .filter(zone => zone.country === normalizedCountry)
      .flatMap(zone => zone.departments)
      .filter((dept, index, arr) => arr.indexOf(dept) === index); // Remove duplicates
  }

  // Search location by partial match
  searchLocation(query: string): Array<{
    country: string;
    department: string;
    zone: string;
    confidence: number;
  }> {
    const normalizedQuery = query.toLowerCase().trim();
    const results: Array<{
      country: string;
      department: string;
      zone: string;
      confidence: number;
    }> = [];

    for (const zone of this.zones) {
      for (const dept of zone.departments) {
        const deptName = dept.replace(/_/g, ' ');
        let confidence = 0;

        // Exact match
        if (deptName === normalizedQuery || dept === normalizedQuery) {
          confidence = 1.0;
        }
        // Starts with
        else if (deptName.startsWith(normalizedQuery) || dept.startsWith(normalizedQuery)) {
          confidence = 0.8;
        }
        // Contains
        else if (deptName.includes(normalizedQuery) || dept.includes(normalizedQuery)) {
          confidence = 0.6;
        }
        // Zone name match
        else if (zone.name.toLowerCase().includes(normalizedQuery)) {
          confidence = 0.4;
        }

        if (confidence > 0) {
          results.push({
            country: zone.country,
            department: dept,
            zone: zone.name,
            confidence
          });
        }
      }
    }

    // Sort by confidence and return top matches
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
}

export default GeolocationService;