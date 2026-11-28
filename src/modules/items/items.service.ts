import { ForbiddenException, NotFoundException } from "@/common/exceptions/http.exception"
import type { CreateItemDto, UpdateItemDto } from "./items.dto"
import type { ItemEntity } from "./items.entity"
import type { ItemsRepository } from "./items.repository"

export class ItemsService {
  constructor(private readonly itemsRepository: ItemsRepository) {}

  async findAll(): Promise<ItemEntity[]> {
    return this.itemsRepository.findAll()
  }

  async findById(id: string): Promise<ItemEntity> {
    const item = await this.itemsRepository.findById(id)
    if (!item) {
      throw new NotFoundException(`Item ${id} not found`)
    }
    return item
  }

  async create(userId: number, dto: CreateItemDto): Promise<ItemEntity> {
    return this.itemsRepository.create({ ...dto, userId })
  }

  async update(id: string, userId: number, dto: UpdateItemDto): Promise<ItemEntity> {
    const existing = await this.findById(id)
    if (existing.userId !== userId) {
      throw new ForbiddenException("You do not have permission to update this item")
    }
    const updated = await this.itemsRepository.update(id, userId, dto)
    if (!updated) {
      throw new NotFoundException(`Item ${id} not found`)
    }
    return updated
  }

  async remove(id: string, userId: number): Promise<void> {
    const existing = await this.findById(id)
    if (existing.userId !== userId) {
      throw new ForbiddenException("You do not have permission to delete this item")
    }
    const deleted = await this.itemsRepository.delete(id, userId)
    if (!deleted) {
      throw new NotFoundException(`Item ${id} not found`)
    }
  }
}
