import {type SchemaTypeDefinition} from 'sanity'

const weeklyReport = {
  name: 'weeklyReport',
  title: 'Weekly Reports',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Report Title',
      type: 'string',
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'weekNumber',
      title: 'NFL Week Number',
      type: 'number',
      validation: (Rule: any) => Rule.required().min(1).max(18)
    },
    {
      name: 'publishDate',
      title: 'Publish Date',
      type: 'datetime',
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'summary',
      title: 'Summary (for widget)',
      type: 'text',
      description: 'Short preview (2-3 sentences)',
      validation: (Rule: any) => Rule.required().max(250)
    },
    {
      name: 'content',
      title: 'Full Report Content',
      type: 'array',
      of: [{type: 'block'}]
    },
    {
      name: 'featured',
      title: 'Featured Report',
      type: 'boolean',
      initialValue: false
    }
  ]
}

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [weeklyReport],
}
