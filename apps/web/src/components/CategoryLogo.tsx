import { BookOpen } from 'lucide-react'

const logos = new Map<string, string[]>([
  ['rust', ['rust']],
  ['python', ['python']],
  ['javascript / typescript', ['javascript', 'typescript']],
  ['c / c++', ['c', 'cplusplus']],
  ['go', ['go']],
  ['java', ['java']],
  ['c#', ['csharp']],
  ['ruby', ['ruby']],
  ['kotlin', ['kotlin']],
  ['swift', ['swift']],
])

export function CategoryLogo({ name }: { name: string }) {
  const icons = logos.get(name.trim().toLowerCase())
  return <span className={icons?.length === 2 ? 'category-logo-group category-logo-pair' : 'category-logo-group'} aria-hidden="true">
    {icons ? icons.map(icon => <img key={icon} src={`/category-logos/${icon}.svg`} alt="" width={22} height={22} />) : <BookOpen size={22} />}
  </span>
}
