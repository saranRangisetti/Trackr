/**
 * Advanced AI Manager
 * Enterprise-grade AI integration with prompt engineering and model optimization
 */

import { AIConfig } from '../architecture/types';
import Logger from '../architecture/Logger';
import ErrorHandler, { ErrorSeverity, ErrorCategory } from '../architecture/ErrorHandler';

export interface AIRequest {
  id: string;
  prompt: string;
  context: Record<string, any>;
  model: string;
  temperature: number;
  maxTokens: number;
  timestamp: number;
  userId?: string;
}

export interface AIResponse {
  id: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  timestamp: number;
  processingTime: number;
}

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  category: 'resume' | 'cover_letter' | 'job_matching' | 'skill_extraction';
  version: string;
  description: string;
}

export default class AIManager {
  private config: AIConfig;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private promptTemplates = new Map<string, PromptTemplate>();
  private requestCache = new Map<string, AIResponse>();
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private modelPerformance = new Map<string, { successRate: number; avgLatency: number; totalRequests: number }>();

  constructor(
    config: Partial<AIConfig>,
    logger: Logger,
    errorHandler: ErrorHandler
  ) {
    this.config = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      timeout: 30000,
      retryAttempts: 3,
      fallbackModel: 'gpt-3.5-turbo',
      ...config
    };

    this.logger = logger;
    this.errorHandler = errorHandler;
    this.initializePromptTemplates();
  }

  /**
   * Generate AI response with advanced prompt engineering
   */
  async generateResponse(
    prompt: string,
    context: Record<string, any> = {},
    options: Partial<AIConfig> = {}
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const startTime = performance.now();

    try {
      // Check rate limiting
      if (!this.checkRateLimit(requestId)) {
        throw new Error('Rate limit exceeded');
      }

      // Check cache
      const cacheKey = this.generateCacheKey(prompt, context);
      const cached = this.requestCache.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached AI response', { requestId, cacheKey });
        return cached;
      }

      // Prepare request
      const request: AIRequest = {
        id: requestId,
        prompt: this.enhancePrompt(prompt, context),
        context,
        model: options.model || this.config.model,
        temperature: options.temperature || this.config.temperature,
        maxTokens: options.maxTokens || this.config.maxTokens,
        timestamp: Date.now(),
        userId: context.userId
      };

      // Make API call with retry
      const response = await this.errorHandler.retry(
        () => this.callAIAPI(request),
        'ai_generation',
        {
          maxAttempts: this.config.retryAttempts,
          baseDelay: 1000,
          retryCondition: (error) => this.isRetryableError(error)
        }
      );

      const processingTime = performance.now() - startTime;

      const aiResponse: AIResponse = {
        id: requestId,
        content: response.content,
        usage: response.usage,
        model: request.model,
        timestamp: Date.now(),
        processingTime
      };

      // Cache response
      this.requestCache.set(cacheKey, aiResponse);

      // Update model performance
      this.updateModelPerformance(request.model, true, processingTime);

      // Log success
      this.logger.info('AI response generated successfully', {
        requestId,
        model: request.model,
        processingTime,
        tokensUsed: response.usage.totalTokens
      });

      return aiResponse;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      // Update model performance
      this.updateModelPerformance(options.model || this.config.model, false, processingTime);

      // Handle error
      await this.errorHandler.handleError(
        error as Error,
        {
          component: 'AIManager',
          action: 'generateResponse',
          requestId,
          processingTime
        },
        ErrorSeverity.HIGH,
        ErrorCategory.EXTERNAL_SERVICE
      );

      throw error;
    }
  }

  /**
   * Generate resume optimization suggestions
   */
  async optimizeResume(
    resumeContent: string,
    jobDescription: string,
    context: Record<string, any> = {}
  ): Promise<AIResponse> {
    const template = this.promptTemplates.get('resume_optimization');
    if (!template) {
      throw new Error('Resume optimization template not found');
    }

    const prompt = this.renderTemplate(template, {
      resumeContent,
      jobDescription,
      ...context
    });

    return this.generateResponse(prompt, {
      ...context,
      category: 'resume_optimization',
      jobDescription
    });
  }

  /**
   * Generate cover letter
   */
  async generateCoverLetter(
    jobDescription: string,
    resumeContent: string,
    companyName: string,
    context: Record<string, any> = {}
  ): Promise<AIResponse> {
    const template = this.promptTemplates.get('cover_letter_generation');
    if (!template) {
      throw new Error('Cover letter template not found');
    }

    const prompt = this.renderTemplate(template, {
      jobDescription,
      resumeContent,
      companyName,
      ...context
    });

    return this.generateResponse(prompt, {
      ...context,
      category: 'cover_letter',
      jobDescription,
      companyName
    });
  }

  /**
   * Extract skills from resume
   */
  async extractSkills(resumeContent: string, context: Record<string, any> = {}): Promise<AIResponse> {
    const template = this.promptTemplates.get('skill_extraction');
    if (!template) {
      throw new Error('Skill extraction template not found');
    }

    const prompt = this.renderTemplate(template, {
      resumeContent,
      ...context
    });

    return this.generateResponse(prompt, {
      ...context,
      category: 'skill_extraction'
    });
  }

  /**
   * Match job with candidate profile
   */
  async matchJob(
    jobDescription: string,
    candidateProfile: Record<string, any>,
    context: Record<string, any> = {}
  ): Promise<AIResponse> {
    const template = this.promptTemplates.get('job_matching');
    if (!template) {
      throw new Error('Job matching template not found');
    }

    const prompt = this.renderTemplate(template, {
      jobDescription,
      candidateProfile: JSON.stringify(candidateProfile, null, 2),
      ...context
    });

    return this.generateResponse(prompt, {
      ...context,
      category: 'job_matching',
      jobDescription
    });
  }

  /**
   * Add custom prompt template
   */
  addPromptTemplate(template: PromptTemplate): void {
    this.promptTemplates.set(template.name, template);
    this.logger.info('Prompt template added', { name: template.name, category: template.category });
  }

  /**
   * Get model performance statistics
   */
  getModelPerformance(): Record<string, { successRate: number; avgLatency: number; totalRequests: number }> {
    return Object.fromEntries(this.modelPerformance);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
    this.logger.info('AI response cache cleared');
  }

  private async callAIAPI(request: AIRequest): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAPIKey()}`
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(request.context)
            },
            {
              role: 'user',
              content: request.prompt
            }
          ],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private enhancePrompt(prompt: string, context: Record<string, any>): string {
    // Add context-aware enhancements
    let enhancedPrompt = prompt;

    // Add role-specific instructions
    if (context.category === 'resume_optimization') {
      enhancedPrompt = `As an expert career coach and ATS specialist, ${enhancedPrompt}`;
    } else if (context.category === 'cover_letter') {
      enhancedPrompt = `As a professional writer and career expert, ${enhancedPrompt}`;
    }

    // Add formatting instructions
    enhancedPrompt += '\n\nPlease provide a clear, professional response that is actionable and specific.';

    return enhancedPrompt;
  }

  private getSystemPrompt(context: Record<string, any>): string {
    const basePrompt = `You are Trackr, an AI-powered career assistant designed to help job seekers optimize their applications and advance their careers. You provide expert, actionable advice with a professional and encouraging tone.`;

    if (context.category === 'resume_optimization') {
      return `${basePrompt} You specialize in resume optimization, ATS compatibility, and keyword matching. Focus on quantifiable achievements and industry-specific terminology.`;
    } else if (context.category === 'cover_letter') {
      return `${basePrompt} You excel at crafting compelling cover letters that showcase candidate value and align with company culture.`;
    }

    return basePrompt;
  }

  private renderTemplate(template: PromptTemplate, variables: Record<string, any>): string {
    let rendered = template.template;

    template.variables.forEach(variable => {
      const value = variables[variable] || '';
      const placeholder = `{{${variable}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    });

    return rendered;
  }

  private initializePromptTemplates(): void {
    // Resume optimization template
    this.addPromptTemplate({
      name: 'resume_optimization',
      template: `Analyze the following resume and job description to provide optimization suggestions:

RESUME:
{{resumeContent}}

JOB DESCRIPTION:
{{jobDescription}}

Please provide:
1. Keyword optimization suggestions
2. Skills to highlight or add
3. Experience formatting improvements
4. ATS compatibility recommendations
5. Quantifiable achievements to emphasize

Focus on making the resume more relevant to this specific role.`,
      variables: ['resumeContent', 'jobDescription'],
      category: 'resume',
      version: '1.0',
      description: 'Optimizes resume content for specific job applications'
    });

    // Cover letter generation template
    this.addPromptTemplate({
      name: 'cover_letter_generation',
      template: `Write a compelling cover letter for the following position:

COMPANY: {{companyName}}
JOB DESCRIPTION: {{jobDescription}}
CANDIDATE BACKGROUND: {{resumeContent}}

The cover letter should:
1. Be personalized and specific to the role
2. Highlight relevant experience and skills
3. Show enthusiasm for the company and position
4. Be professional yet engaging
5. Include a strong opening and closing

Length: 3-4 paragraphs, professional tone.`,
      variables: ['companyName', 'jobDescription', 'resumeContent'],
      category: 'cover_letter',
      version: '1.0',
      description: 'Generates personalized cover letters'
    });

    // Skill extraction template
    this.addPromptTemplate({
      name: 'skill_extraction',
      template: `Extract and categorize all skills from this resume:

RESUME:
{{resumeContent}}

Please provide:
1. Technical skills (programming languages, tools, software)
2. Soft skills (leadership, communication, etc.)
3. Industry-specific skills
4. Certifications and qualifications
5. Years of experience for each skill (if mentioned)

Format as a structured list with categories.`,
      variables: ['resumeContent'],
      category: 'skill_extraction',
      version: '1.0',
      description: 'Extracts and categorizes skills from resume content'
    });

    // Job matching template
    this.addPromptTemplate({
      name: 'job_matching',
      template: `Analyze the compatibility between this job and candidate:

JOB DESCRIPTION:
{{jobDescription}}

CANDIDATE PROFILE:
{{candidateProfile}}

Provide:
1. Match percentage (0-100%)
2. Strengths that align with the role
3. Potential gaps or concerns
4. Recommendations for improvement
5. Salary expectations based on profile

Be specific and actionable in your analysis.`,
      variables: ['jobDescription', 'candidateProfile'],
      category: 'job_matching',
      version: '1.0',
      description: 'Matches candidate profile with job requirements'
    });
  }

  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(prompt: string, context: Record<string, any>): string {
    const contextStr = JSON.stringify(context, Object.keys(context).sort());
    return btoa(prompt + contextStr).substr(0, 32);
  }

  private checkRateLimit(requestId: string): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 60; // 60 requests per minute

    const limit = this.rateLimiter.get(requestId);
    if (!limit || now > limit.resetTime) {
      this.rateLimiter.set(requestId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (limit.count >= maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      'rate limit',
      'server error',
      'temporary'
    ];

    return retryableErrors.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  private updateModelPerformance(model: string, success: boolean, latency: number): void {
    const current = this.modelPerformance.get(model) || {
      successRate: 0,
      avgLatency: 0,
      totalRequests: 0
    };

    current.totalRequests++;
    current.avgLatency = (current.avgLatency * (current.totalRequests - 1) + latency) / current.totalRequests;
    
    if (success) {
      current.successRate = (current.successRate * (current.totalRequests - 1) + 1) / current.totalRequests;
    } else {
      current.successRate = (current.successRate * (current.totalRequests - 1)) / current.totalRequests;
    }

    this.modelPerformance.set(model, current);
  }

  private getAPIKey(): string {
    // In production, this would come from secure storage
    return process.env.OPENAI_API_KEY || '';
  }
}
