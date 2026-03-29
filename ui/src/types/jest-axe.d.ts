declare module 'jest-axe' {
  export interface AxeViolation {
    id: string
    impact?: string | null
    description: string
    help: string
    helpUrl: string
  }

  export interface AxeResults {
    violations: AxeViolation[]
  }

  export function axe(element: Element | DocumentFragment): Promise<AxeResults>
}
