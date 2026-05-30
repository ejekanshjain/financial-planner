import type { MetadataRoute } from 'next'
import { SITE_URL } from '~/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The chat API is dynamic and not useful to crawlers.
      disallow: ['/api/']
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  }
}
